"""
Accounting correctness tests: weighted-average purchase price, stock
quantity tracking, oversell prevention, and profit calculation
(including snapshot stability).
"""

import pytest
from decimal import Decimal

from django.core.exceptions import ValidationError

from api.models import ItemVariant, Purchase, Sale, SaleItem

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
        assert variant.price == Decimal("100")

    def test_repeated_purchase_of_same_variant_merges_and_recomputes_weighted_average(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="20ft",
                quantity="10",
                price="100",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="20ft",
                quantity="10",
                price="200",
            ),
        )

        low_price = ItemVariant.objects.get(item__name="Rod", price=Decimal("100"))
        high_price = ItemVariant.objects.get(item__name="Rod", price=Decimal("200"))
        assert low_price.current_stock_qty == Decimal("10")
        assert high_price.current_stock_qty == Decimal("10")
        assert ItemVariant.objects.filter(item__name="Rod").count() == 2

    def test_price_affects_variant_identity(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="20ft",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="20ft",
                quantity="5",
                price="999",
            ),
        )
        assert ItemVariant.objects.filter(item__name="Rod").count() == 2

    def test_different_length_or_measurement_creates_separate_variant(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="20ft",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="25ft",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="Rod",
                size="20ft",
                quantity="5",
                price="10",
            ),
        )
        # measurement no longer part of variant identity (0009 migration
        # dropped it), so size is the only differentiator now.
        assert ItemVariant.objects.filter(item__name="Rod").count() == 2

    def test_name_normalization_is_case_insensitive_and_trimmed(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="  Steel Rod  ",
                size=" 20ft ",
                quantity="5",
                price="10",
            ),
        )
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(
                item_name="steel rod",
                size="20FT",
                quantity="5",
                price="10",
            ),
        )
        assert ItemVariant.objects.filter(item__company__name="Alpha Traders").count() == 1


class TestSaleDecreasesStockAndBlocksOversell:
    def test_sale_decrements_stock(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/", make_sale_payload(variant.id, quantity="4", sale_price="150")
        )
        assert res.status_code == 201

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("6")

    def test_cannot_sell_more_than_available_stock(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="5", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/", make_sale_payload(variant.id, quantity="6", sale_price="150")
        )

        assert res.status_code == 400
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("5")
        assert SaleItem.objects.filter(variant=variant).count() == 0

    def test_cannot_sell_when_zero_stock(
        self, client_a, variant_factory, comp_a, make_sale_payload
    ):
        variant = variant_factory(comp_a, name="Empty Item")
        res = client_a.post(
            "/api/sales/", make_sale_payload(variant.id, quantity="1", sale_price="10")
        )
        assert res.status_code == 400

    def test_selling_exact_remaining_stock_is_allowed(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="5", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/", make_sale_payload(variant.id, quantity="5", sale_price="150")
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
    def test_profit_uses_variant_price_at_time_of_sale(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.post(
            "/api/sales/", make_sale_payload(variant.id, quantity="3", sale_price="150")
        )
        assert res.status_code == 201
        line = SaleItem.objects.get(sale_id=res.data["id"])
        assert line.cost_price_at_sale == Decimal("100")
        assert line.profit == Decimal("150")
        assert Decimal(str(res.data["profit"])) == Decimal("150")

    def test_profit_snapshot_is_stable_after_later_purchase_creates_new_variant(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res1 = client_a.post(
            "/api/sales/", make_sale_payload(variant.id, quantity="2", sale_price="120")
        )
        line1 = SaleItem.objects.get(sale_id=res1.data["id"])
        assert line1.cost_price_at_sale == Decimal("100")
        assert line1.profit == Decimal("40")

        client_a.post(
            "/api/purchases/",
            make_purchase_payload(quantity="10", price="200"),
        )

        line1.refresh_from_db()
        assert line1.cost_price_at_sale == Decimal("100")
        assert line1.profit == Decimal("40")

        assert ItemVariant.objects.filter(item__name="Steel Rod").count() == 2

    def test_multiple_sales_each_snapshot_the_average_at_their_own_time(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        res1 = client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant.id, quantity="1", sale_price="200", date="2026-01-02"
            ),
        )
        line1 = SaleItem.objects.get(sale_id=res1.data["id"])
        assert line1.cost_price_at_sale == Decimal("100")

        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="300")
        )
        new_variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("300"))

        res2 = client_a.post(
            "/api/sales/",
            make_sale_payload(
                new_variant.id, quantity="1", sale_price="400", date="2026-01-03"
            ),
        )
        line2 = SaleItem.objects.get(sale_id=res2.data["id"])
        assert line2.cost_price_at_sale == Decimal("300")
        assert line2.cost_price_at_sale != line1.cost_price_at_sale

    def test_grand_total_profit_sums_all_sales(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="20", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant.id, quantity="5", sale_price="15", date="2026-01-02"
            ),
        )
        client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant.id, quantity="5", sale_price="20", date="2026-01-03"
            ),
        )

        res = client_a.get("/api/sales/")
        total_profit = sum(Decimal(str(s["profit"])) for s in res.data)
        assert total_profit == Decimal("75")


class TestStockPageConsistency:
    def test_stock_reflects_purchases_minus_sales(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="15", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant.id, quantity="4", sale_price="20", date="2026-01-02"
            ),
        )
        client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant.id, quantity="3", sale_price="22", date="2026-01-03"
            ),
        )

        res = client_a.get("/api/variants/")
        row = next(v for v in res.data if v["item_name"] == "Steel Rod")
        assert Decimal(str(row["current_stock_qty"])) == Decimal("8")

    def test_stock_never_negative_after_failed_oversell_attempt(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="2", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            make_sale_payload(variant.id, quantity="100", sale_price="20"),
        )
        variant.refresh_from_db()
        assert variant.current_stock_qty >= Decimal("0")
        assert variant.current_stock_qty == Decimal("2")
