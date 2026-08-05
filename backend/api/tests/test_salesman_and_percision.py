"""
Two focused areas:
1. Salesman shared per-company table across Purchase and Sale.
2. Decimal precision on price-specific variants and profit.
"""

import pytest
from decimal import Decimal

from api.models import ItemVariant, Salesman, Purchase, Sale, SaleItem

pytestmark = pytest.mark.django_db


def purchase_payload(**overrides):
    payload = {
        "items": [
            {
                "item_name": "Steel Rod",
                "size": "20ft",
                "quantity": "10",
                "price": "100",
            }
        ],
        "date": "2026-01-01",
        "salesman_name": "",
        "party_name": "Default Supplier",
        "party_contact": "923001110000",
    }
    for key in ("item_name", "size", "quantity", "price"):
        if key in overrides:
            payload["items"][0][key] = overrides.pop(key)
    payload.update(overrides)
    return payload


def sale_payload(variant_id, **overrides):
    payload = {
        "items": [
            {
                "variant": variant_id,
                "quantity": "1",
                "sale_price": "100",
            }
        ],
        "date": "2026-01-02",
        "salesman_name": "",
        "party_name": "Default Buyer",
        "party_contact": "923002220000",
    }
    for key in ("quantity", "sale_price"):
        if key in overrides:
            payload["items"][0][key] = overrides.pop(key)
    payload.update(overrides)
    return payload


class TestSalesmanSharedAcrossPurchaseAndSale:
    def test_salesman_created_on_purchase_is_reused_on_sale(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(salesman_name="Ali Raza"))
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("100"))

        client_a.post(
            "/api/sales/",
            sale_payload(
                variant.id, quantity="2", sale_price="150", salesman_name="Ali Raza"
            ),
        )

        assert Salesman.objects.filter(name="Ali Raza").count() == 1
        salesman = Salesman.objects.get(name="Ali Raza")
        assert Purchase.objects.filter(salesman=salesman).count() == 1
        assert Sale.objects.filter(salesman=salesman).count() == 1

    def test_salesman_created_on_sale_is_reused_on_purchase(self, client_a):
        client_a.post("/api/purchases/", purchase_payload())
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("100"))

        client_a.post(
            "/api/sales/",
            sale_payload(
                variant.id, quantity="2", sale_price="150", salesman_name="Zara Ahmed"
            ),
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
        assert Salesman.objects.filter(name="Common Name").count() == 2

    def test_purchase_list_filters_by_salesman(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(salesman_name="Ali Raza"))
        client_a.post(
            "/api/purchases/",
            purchase_payload(item_name="Cement", salesman_name="Zara Ahmed"),
        )
        salesman = Salesman.objects.get(name="Ali Raza")

        res = client_a.get("/api/purchases/", {"salesman": salesman.id})

        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]["salesman_name"] == "Ali Raza"

    def test_sale_list_filters_by_salesman(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(quantity="10"))
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("100"))
        client_a.post(
            "/api/sales/",
            sale_payload(variant.id, quantity="2", salesman_name="Ali Raza"),
        )
        client_a.post(
            "/api/sales/",
            sale_payload(variant.id, quantity="3", salesman_name="Zara Ahmed"),
        )
        salesman = Salesman.objects.get(name="Ali Raza")

        res = client_a.get("/api/sales/", {"salesman": salesman.id})

        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]["salesman_name"] == "Ali Raza"


class TestDecimalPrecision:
    def test_mixed_prices_create_exact_price_specific_variants(
        self, client_a
    ):
        client_a.post("/api/purchases/", purchase_payload(quantity="3", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="7", price="11"))
        low = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))
        high = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("11"))
        assert low.current_stock_qty == Decimal("3")
        assert high.current_stock_qty == Decimal("7")

    def test_duplicate_decimal_price_merges_into_existing_variant(
        self, client_a
    ):
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))

        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("11"))
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("2")
        assert variant.price == Decimal("11")

    def test_profit_calculation_precision_on_sale(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))

        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))
        variant.refresh_from_db()
        res = client_a.post(
            "/api/sales/",
            sale_payload(
                variant.id, quantity="1", sale_price="15.33", date="2026-01-05"
            ),
        )
        assert res.status_code == 201
        line = SaleItem.objects.get(sale_id=res.data["id"])

        expected_profit = Decimal("5.33")
        assert line.cost_price_at_sale == Decimal("10")
        assert line.profit == expected_profit
        assert line.profit == line.profit.quantize(Decimal("0.01"))

    def test_grand_total_profit_sums_decimals_exactly(self, client_a):
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="10"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        client_a.post("/api/purchases/", purchase_payload(quantity="1", price="11"))
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))

        client_a.post(
            "/api/sales/",
            sale_payload(
                variant.id, quantity="1", sale_price="15.33", date="2026-01-05"
            ),
        )
        variant.refresh_from_db()
        client_a.post(
            "/api/sales/",
            sale_payload(
                variant.id, quantity="1", sale_price="12.01", date="2026-01-06"
            ),
        )

        res = client_a.get("/api/sales/")
        total_profit = sum(Decimal(str(s["profit"])) for s in res.data)
        assert total_profit == total_profit.quantize(Decimal("0.01"))
