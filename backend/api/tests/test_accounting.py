"""
Accounting correctness tests: weighted-average purchase price, stock
quantity tracking, oversell prevention, and profit calculation
(including snapshot stability).
"""

import pytest
from decimal import Decimal

from django.core.exceptions import ValidationError

from api.models import ItemVariant, Purchase, Sale

pytestmark = pytest.mark.django_db


class TestPurchaseIncreasesStockAndAveragePrice:
    def test_single_purchase_sets_stock_and_avg_price(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(item_name="Rod", quantity="10", price="100"),
        )
        variant = ItemVariant.objects.get(item__name="Rod")

        assert variant.current_stock_qty == Decimal("10")
        assert variant.avg_purchase_price == Decimal("100")
        assert variant.total_purchased_qty == Decimal("10")
        assert variant.total_purchased_value == Decimal("1000")

    def test_repeated_purchase_of_same_variant_merges_and_recomputes_weighted_average(
        self, client_a, make_purchase_payload
    ):
        # 10 units @ 100 => value 1000
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="20ft",
                measurement="12mm",
                quantity="10",
                price="100",
            ),
        )
        # 10 units @ 200 => value 2000 (same name+length+measurement -> same variant)
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="20ft",
                measurement="12mm",
                quantity="10",
                price="200",
            ),
        )

        variant = ItemVariant.objects.get(item__name="Rod")
        # total qty = 20, total value = 3000 => avg = 150
        assert variant.current_stock_qty == Decimal("20")
        assert variant.total_purchased_qty == Decimal("20")
        assert variant.total_purchased_value == Decimal("3000")
        assert variant.avg_purchase_price == Decimal("150")

        # Only one variant/stock row should exist for this combo.
        assert ItemVariant.objects.filter(item__name="Rod").count() == 1

    def test_price_does_not_affect_variant_identity(
        self, client_a, make_purchase_payload
    ):
        """Same name+length+measurement merges regardless of price difference."""
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="20ft",
                measurement="12mm",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="20ft",
                measurement="12mm",
                quantity="5",
                price="999",
            ),
        )
        assert ItemVariant.objects.filter(item__name="Rod").count() == 1

    def test_different_length_or_measurement_creates_separate_variant(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="20ft",
                measurement="12mm",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="25ft",
                measurement="12mm",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                length="20ft",
                measurement="16mm",
                quantity="5",
                price="10",
            ),
        )
        assert ItemVariant.objects.filter(item__name="Rod").count() == 3

    def test_name_normalization_is_case_insensitive_and_trimmed(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="  Steel Rod  ",
                length=" 20ft ",
                measurement=" 12mm ",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="steel rod",
                length="20FT",
                measurement="12MM",
                quantity="5",
                price="10",
            ),
        )
        assert (
            ItemVariant.objects.filter(item__company__name="Alpha Traders").count() == 1
        )


class TestSaleDecreasesStockAndBlocksOversell:
    def test_sale_decrements_stock(self, client_a, make_purchase_payload):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "4",
                "sale_price": "150",
                "date": "2026-01-02",
            },
        )
        assert res.status_code == 201

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("6")

    def test_cannot_sell_more_than_available_stock(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="5", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "6",
                "sale_price": "150",
                "date": "2026-01-02",
            },
        )

        assert res.status_code == 400
        variant.refresh_from_db()
        # Stock must remain unchanged; no partial sale should be recorded.
        assert variant.current_stock_qty == Decimal("5")
        assert Sale.objects.filter(variant=variant).count() == 0

    def test_cannot_sell_when_zero_stock(self, client_a, variant_factory, comp_a):
        variant = variant_factory(comp_a, name="Empty Item")
        # No purchase made -> stock is 0.
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "10",
                "date": "2026-01-02",
            },
        )
        assert res.status_code == 400

    def test_selling_exact_remaining_stock_is_allowed(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="5", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "5",
                "sale_price": "150",
                "date": "2026-01-02",
            },
        )
        assert res.status_code == 201
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("0")

    def test_model_level_record_sale_raises_validation_error_on_oversell(
        self, comp_a, variant_factory
    ):
        variant = variant_factory(comp_a, name="Direct Model Item")
        variant.record_purchase(Decimal("3"), Decimal("10"))
        with pytest.raises(ValidationError):
            variant.record_sale(Decimal("4"))


class TestProfitCalculation:
    def test_profit_uses_avg_purchase_price_at_time_of_sale(
        self, client_a, make_purchase_payload
    ):
        # Buy 10 @ 100 (avg = 100)
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        # Sell 3 @ 150 while avg is 100 -> profit = (150-100)*3 = 150
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "3",
                "sale_price": "150",
                "date": "2026-01-02",
            },
        )
        assert res.status_code == 201
        sale = Sale.objects.get(id=res.data["id"])
        assert sale.purchase_price_snapshot == Decimal("100")
        assert sale.profit == Decimal("150")

    def test_profit_snapshot_is_stable_after_later_purchase_changes_average(
        self, client_a, make_purchase_payload
    ):
        # Buy 10 @ 100 -> avg = 100
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        # Sell 2 @ 120 while avg = 100 -> profit snapshot should lock at 100
        res1 = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "2",
                "sale_price": "120",
                "date": "2026-01-02",
            },
        )
        sale1 = Sale.objects.get(id=res1.data["id"])
        assert sale1.purchase_price_snapshot == Decimal("100")
        assert sale1.profit == Decimal("40")  # (120-100)*2

        # New purchase shifts the weighted average: buy 10 more @ 200
        # total qty = 8 (remaining) + 10 = 18, total value = 800 + 2000 = 2800 => avg ~155.56
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(quantity="10", price="200"),
        )

        # The FIRST sale's snapshot/profit must be unchanged.
        sale1.refresh_from_db()
        assert sale1.purchase_price_snapshot == Decimal("100")
        assert sale1.profit == Decimal("40")

        variant.refresh_from_db()
        assert variant.avg_purchase_price != Decimal("100")

    def test_multiple_sales_each_snapshot_the_average_at_their_own_time(
        self, client_a, make_purchase_payload
    ):
        # Buy 10 @ 100
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res1 = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "200",
                "date": "2026-01-02",
            },
        )
        sale1 = Sale.objects.get(id=res1.data["id"])
        assert sale1.purchase_price_snapshot == Decimal("100")

        # Buy 10 more @ 300: remaining 9 @ value 900 + 10*300=3000 => total 3900/19 ~205.26
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="300")
        )
        variant.refresh_from_db()
        new_avg = variant.avg_purchase_price

        res2 = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "400",
                "date": "2026-01-03",
            },
        )
        sale2 = Sale.objects.get(id=res2.data["id"])
        assert sale2.purchase_price_snapshot == new_avg
        assert sale2.purchase_price_snapshot != sale1.purchase_price_snapshot

    def test_grand_total_profit_sums_all_sales(self, client_a, make_purchase_payload):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="20", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "5",
                "sale_price": "15",
                "date": "2026-01-02",
            },
        )
        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "5",
                "sale_price": "20",
                "date": "2026-01-03",
            },
        )

        res = client_a.get("/api/sales/")
        total_profit = sum(Decimal(str(s["profit"])) for s in res.data)
        # (15-10)*5 + (20-10)*5 = 25 + 50 = 75
        assert total_profit == Decimal("75")


class TestStockPageConsistency:
    def test_stock_reflects_purchases_minus_sales(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="15", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "4",
                "sale_price": "20",
                "date": "2026-01-02",
            },
        )
        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "3",
                "sale_price": "22",
                "date": "2026-01-03",
            },
        )

        res = client_a.get("/api/variants/")
        row = next(v for v in res.data if v["item_name"] == "Steel Rod")
        assert Decimal(str(row["current_stock_qty"])) == Decimal("8")  # 15 - 4 - 3

    def test_stock_never_negative_after_failed_oversell_attempt(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="2", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "100",
                "sale_price": "20",
                "date": "2026-01-02",
            },
        )
        variant.refresh_from_db()
        assert variant.current_stock_qty >= Decimal("0")
        assert variant.current_stock_qty == Decimal("2")
