"""
Multi-tenancy isolation tests.
"""

import pytest
from decimal import Decimal

from api.models import Item, ItemVariant, Sale

pytestmark = pytest.mark.django_db


class TestItemIsolation:
    def test_items_are_scoped_per_company(self, client_a, client_b):
        client_a.post("/api/items/", {"name": "Cement Bag"})
        client_b.post("/api/items/", {"name": "Steel Rod"})

        res_a = client_a.get("/api/items/")
        res_b = client_b.get("/api/items/")

        assert [i["name"] for i in res_a.data] == ["Cement Bag"]
        assert [i["name"] for i in res_b.data] == ["Steel Rod"]

    def test_same_item_name_allowed_across_different_companies(
        self, client_a, client_b
    ):
        res_a = client_a.post("/api/items/", {"name": "Steel Rod"})
        res_b = client_b.post("/api/items/", {"name": "Steel Rod"})

        assert res_a.status_code == 201
        assert res_b.status_code == 201
        assert Item.objects.filter(name="Steel Rod").count() == 2


class TestSalesmanIsolation:
    def test_salesmen_scoped_per_company(self, client_a, client_b):
        client_a.post("/api/salesmen/", {"name": "Ali"})
        client_b.post("/api/salesmen/", {"name": "Zara"})

        res_a = client_a.get("/api/salesmen/")
        res_b = client_b.get("/api/salesmen/")

        assert [s["name"] for s in res_a.data] == ["Ali"]
        assert [s["name"] for s in res_b.data] == ["Zara"]


class TestVariantAndStockIsolation:
    def test_variants_scoped_per_company(
        self, client_a, client_b, make_purchase_payload
    ):
        client_a.post("/api/purchases/", make_purchase_payload(item_name="Pipe"))
        client_b.post("/api/purchases/", make_purchase_payload(item_name="Wire"))

        res_a = client_a.get("/api/variants/")
        res_b = client_b.get("/api/variants/")

        assert [v["item_name"] for v in res_a.data] == ["Pipe"]
        assert [v["item_name"] for v in res_b.data] == ["Wire"]

    def test_company_cannot_sell_against_another_companys_variant(
        self, client_a, variant_factory, comp_b, make_sale_payload
    ):
        variant_b = variant_factory(comp_b, name="Cable", size="100m")
        variant_b.record_purchase(Decimal("50"), Decimal("10"))

        res = client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant_b.id, quantity="5", sale_price="20", date="2026-01-05"
            ),
        )

        assert res.status_code == 400
        variant_b.refresh_from_db()
        assert variant_b.current_stock_qty == Decimal("50")
        assert Sale.objects.filter(variant=variant_b).count() == 0

    def test_company_cannot_see_variants_by_filtering_other_companys_item_id(
        self, client_a, variant_factory, comp_b
    ):
        variant_b = variant_factory(comp_b, name="Cable")
        res = client_a.get(f"/api/variants/?item={variant_b.item_id}")
        assert res.data == []


class TestPurchaseSaleIsolation:
    def test_purchases_scoped_per_company(
        self, client_a, client_b, make_purchase_payload
    ):
        client_a.post("/api/purchases/", make_purchase_payload(item_name="Bricks"))
        client_b.post("/api/purchases/", make_purchase_payload(item_name="Sand"))

        res_a = client_a.get("/api/purchases/")
        res_b = client_b.get("/api/purchases/")

        assert len(res_a.data) == 1
        assert len(res_b.data) == 1
        assert res_a.data[0]["item_name"] == "Bricks"
        assert res_b.data[0]["item_name"] == "Sand"

    def test_sales_scoped_per_company(
        self, client_a, client_b, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(item_name="Bricks", quantity="20")
        )
        variant_a = ItemVariant.objects.get(
            item__name="Bricks", item__company__name="Alpha Traders"
        )
        client_a.post(
            "/api/sales/",
            make_sale_payload(variant_a.id, quantity="5", sale_price="150"),
        )

        res_a = client_a.get("/api/sales/")
        res_b = client_b.get("/api/sales/")

        assert len(res_a.data) == 1
        assert len(res_b.data) == 0

    def test_profit_view_data_not_leaked_across_companies(
        self, client_a, client_b, make_purchase_payload, make_sale_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(item_name="Paint", quantity="10", price="50"),
        )
        variant_a = ItemVariant.objects.get(item__name="Paint")
        client_a.post(
            "/api/sales/",
            make_sale_payload(
                variant_a.id, quantity="2", sale_price="80", date="2026-01-03"
            ),
        )

        res_b = client_b.get("/api/sales/")
        assert res_b.data == []


class TestAuthIsolation:
    def test_unauthenticated_request_rejected(self):
        from rest_framework.test import APIClient

        client = APIClient()
        res = client.get("/api/items/")
        assert res.status_code == 403

    def test_invalid_token_rejected(self):
        from rest_framework.test import APIClient

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Token not-a-real-token")
        res = client.get("/api/items/")
        assert res.status_code == 403

    def test_me_endpoint_returns_only_own_company(
        self, client_a, client_b, comp_a, comp_b
    ):
        res_a = client_a.get("/api/me/")
        res_b = client_b.get("/api/me/")

        assert res_a.data["company_name"] == comp_a.name
        assert res_b.data["company_name"] == comp_b.name
        assert res_a.data["company_name"] != res_b.data["company_name"]
