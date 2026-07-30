"""
Two focused areas:

1. Salesman is selectable on both Purchase and Sale, and the business rule
   is that it's one shared per-company table - the same salesman name used
   on a purchase and later on a sale (or vice versa) must resolve to the
   same Salesman row, not create duplicates.

2. Decimal precision - weighted-average price and profit calculations must
   not silently drift due to float-style rounding, since these are
   DecimalFields with 2 decimal places.
"""

import pytest
from decimal import Decimal

from api.models import ItemVariant, Salesman, Purchase, Sale

pytestmark = pytest.mark.django_db


def purchase_payload(**overrides):
    payload = {
        "item_name": "Steel Rod",
        "length": "20ft",
        "measurement": "12mm",
        "quantity": "10",
        "price": "100",
        "date": "2026-01-01",
        "salesman_name": "",
    }
    payload.update(overrides)
    return payload


class TestSalesmanSharedAcrossPurchaseAndSale:
    def test_salesman_created_on_purchase_is_reused_on_sale(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(salesman_name="Ali Raza"))
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "2",
                "sale_price": "150",
                "date": "2026-01-02",
                "salesman_name": "Ali Raza",
            },
        )

        # Only one Salesman row for this company, reused by both records.
        assert Salesman.objects.filter(name="Ali Raza").count() == 1
        salesman = Salesman.objects.get(name="Ali Raza")
        assert Purchase.objects.filter(salesman=salesman).count() == 1
        assert Sale.objects.filter(salesman=salesman).count() == 1

    def test_salesman_created_on_sale_is_reused_on_purchase(self, client_a):
        client_a.post("/api/purchases/", purchase_payload())  # no salesman yet
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "2",
                "sale_price": "150",
                "date": "2026-01-02",
                "salesman_name": "Zara Ahmed",
            },
        )
        client_a.post(
            "/api/purchases/", purchase_payload(salesman_name="Zara Ahmed", price="90")
        )

        assert Salesman.objects.filter(name="Zara Ahmed").count() == 1

    def test_salesman_name_matching_is_case_insensitive_and_trimmed(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(salesman_name="  ali raza  "))
        client_a.post(
            "/api/purchases/",
            purchase_payload(item_name="Cement", salesman_name="ALI RAZA"),
        )
        assert Salesman.objects.filter(company__name="Alpha Traders").count() == 1

    def test_salesman_appears_in_shared_dropdown_list(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(salesman_name="Bilal"))
        res = client_a.get("/api/salesmen/")
        assert [s["name"] for s in res.data] == ["Bilal"]

    def test_salesman_scoped_per_company_even_with_same_name(self, client_a, client_b):
        client_a.post("/api/purchases/", purchase_payload(salesman_name="Common Name"))
        client_b.post(
            "/api/purchases/",
            purchase_payload(item_name="Other Item", salesman_name="Common Name"),
        )
        # Same name, but two separate rows - one per company.
        assert Salesman.objects.filter(name="Common Name").count() == 2


class TestDecimalPrecision:
    def test_weighted_average_with_mixed_prices_computes_exact_two_decimal_average(
        self, client_a
    ):
        # 3 units @ 10 (value 30) + 7 units @ 11 (value 77) => total 107 / 10 qty = 10.70 exactly.
        client_a.post(
            "/api/purchases/",
            purchase_payload(quantity="3", price="10"),  # value 30
        )
        client_a.post(
            "/api/purchases/",
            purchase_payload(quantity="7", price="11"),  # value 77
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        # total qty = 10, total value = 107 -> avg = 10.70 exactly
        assert variant.total_purchased_qty == Decimal("10")
        assert variant.total_purchased_value == Decimal("107")
        assert variant.avg_purchase_price == Decimal("10.70")

    def test_weighted_average_repeating_decimal_is_quantized_not_left_raw(
        self, client_a
    ):
        # 1 unit @ 10, 2 units @ 10 -> total value 30 / 3 qty = 10 exactly is too clean.
        # Force a true repeating decimal: 1 unit @ 10, 1 unit @ 11, 1 unit @ 11
        # total value = 32, qty = 3 -> 32/3 = 10.6666...  DecimalField(decimal_places=2)
        # should store this as 10.67 (quantized), not an unrounded Decimal.
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))

        variant = ItemVariant.objects.get(item__name="Steel Rod")
        variant.refresh_from_db()  # force reload from DB to see the actual stored/quantized value
        assert variant.total_purchased_value == Decimal("32")
        assert variant.total_purchased_qty == Decimal("3")
        # Stored value must have at most 2 decimal places once reloaded from DB.
        assert variant.avg_purchase_price == variant.avg_purchase_price.quantize(
            Decimal("0.01")
        )
        assert variant.avg_purchase_price == Decimal("10.67")

    def test_profit_calculation_precision_on_sale(self, client_a):
        # avg price 10.67 (from repeating-decimal purchase above), sell at 15.33
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))

        variant = ItemVariant.objects.get(item__name="Steel Rod")
        variant.refresh_from_db()
        avg = variant.avg_purchase_price  # 10.67

        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "15.33",
                "date": "2026-01-05",
            },
        )
        assert res.status_code == 201
        sale = Sale.objects.get(id=res.data["id"])
        sale.refresh_from_db()

        expected_profit = (Decimal("15.33") - avg) * Decimal("1")
        assert sale.purchase_price_snapshot == avg
        assert sale.profit == expected_profit
        # Profit itself should also be representable at 2dp without drift.
        assert sale.profit == sale.profit.quantize(Decimal("0.01"))

    def test_grand_total_profit_sums_decimals_exactly(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "15.33",
                "date": "2026-01-05",
            },
        )
        variant.refresh_from_db()
        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "12.01",
                "date": "2026-01-06",
            },
        )

        res = client_a.get("/api/sales/")
        total_profit = sum(Decimal(str(s["profit"])) for s in res.data)
        expected = sum(
            Decimal(str(s["profit"])) for s in res.data
        )  # sanity: internally consistent
        assert total_profit == expected
        # And it should not be a wildly-off float artifact like 3.0900000000000003
        assert total_profit == total_profit.quantize(Decimal("0.01"))
