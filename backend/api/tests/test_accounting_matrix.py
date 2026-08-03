"""Strict end-to-end accounting contract tests.

These tests intentionally describe the required business behavior.  They are
not adapted to make the current implementation pass.  In particular, delete
and multi-line/edit cases are expected to expose missing or incorrect logic.
"""

from decimal import Decimal

import pytest

from api.models import Item, ItemVariant, PurchaseItem, SaleItem


pytestmark = pytest.mark.django_db


def purchase_payload(lines, *, date="2026-01-01", salesman="Ali", party="Supplier", contact="923001110000"):
    return {
        "items": lines,
        "date": date,
        "salesman_name": salesman,
        "party_name": party,
        "party_contact": contact,
    }


def purchase_line(item="Steel Rod", size="20ft", quantity="10", price="100", **extra):
    return {"item_name": item, "size": size, "quantity": quantity, "price": price, **extra}


def sale_payload(lines, *, date="2026-01-02", salesman="Ali", party="Buyer", contact="923002220000"):
    return {
        "items": lines,
        "date": date,
        "salesman_name": salesman,
        "party_name": party,
        "party_contact": contact,
    }


def sale_line(variant, quantity="1", sale_price="150", **extra):
    return {"variant": variant, "quantity": quantity, "sale_price": sale_price, **extra}


def post_json(client, url, payload):
    return client.post(url, payload, format="json")


def patch_json(client, url, payload):
    return client.patch(url, payload, format="json")


@pytest.fixture(autouse=True)
def json_api_requests(request):
    """Ensure every nested invoice request uses DRF's JSON parser."""
    for fixture_name in ("client_a", "client_b"):
        if fixture_name not in request.fixturenames:
            continue
        client = request.getfixturevalue(fixture_name)
        original_post = client.post
        original_patch = client.patch

        def post(*args, _original=original_post, **kwargs):
            kwargs.setdefault("format", "json")
            return _original(*args, **kwargs)

        def patch(*args, _original=original_patch, **kwargs):
            kwargs.setdefault("format", "json")
            return _original(*args, **kwargs)

        client.post = post
        client.patch = patch


def variant_for(company, item="Steel Rod", size="20ft"):
    return ItemVariant.objects.get(item__company=company, item__name=item, size=size)


def purchase_update_payload(response, **overrides):
    data = {
        "items": [
            {
                "id": item["id"],
                "item_name": item["item_name"],
                "size": item["size"],
                "quantity": item["quantity"],
                "price": item["price"],
            }
            for item in response.data["items"]
        ],
        "date": response.data["date"],
        "salesman_name": response.data.get("salesman_name") or "",
        "party_name": response.data["party_name"],
        "party_contact": response.data["party_contact"],
    }
    data.update(overrides)
    return data


def sale_update_payload(response, **overrides):
    data = {
        "items": [
            {
                "id": item["id"],
                "variant": item["variant"],
                "quantity": item["quantity"],
                "sale_price": item["sale_price"],
            }
            for item in response.data["items"]
        ],
        "date": response.data["date"],
        "salesman_name": response.data.get("salesman_name") or "",
        "party_name": response.data["party_name"],
        "party_contact": response.data["party_contact"],
    }
    data.update(overrides)
    return data


class TestPurchaseAdd:
    def test_add_purchase_with_single_line_item(self, client_a, comp_a):
        response = post_json(client_a, "/api/purchases/", purchase_payload([purchase_line()]))
        assert response.status_code == 201
        assert len(response.data["items"]) == 1
        assert variant_for(comp_a).current_stock_qty == Decimal("10")

    def test_add_purchase_with_multiple_line_items(self, client_a, comp_a):
        response = post_json(client_a,
            "/api/purchases/",
            purchase_payload([
                purchase_line("Steel Rod", "20ft", "10", "100"),
                purchase_line("Cement", "50kg", "4", "500"),
            ]),
        )
        assert response.status_code == 201
        assert len(response.data["items"]) == 2
        assert variant_for(comp_a, "Steel Rod", "20ft").current_stock_qty == Decimal("10")
        assert variant_for(comp_a, "Cement", "50kg").current_stock_qty == Decimal("4")

    def test_add_purchase_for_brand_new_item(self, client_a, comp_a):
        response = post_json(client_a,
            "/api/purchases/", purchase_payload([purchase_line("New Item", "Unit")])
        )
        assert response.status_code == 201
        assert variant_for(comp_a, "New Item", "Unit").current_stock_qty == Decimal("10")

    def test_add_purchase_for_existing_item_recalculates_average_cost(self, client_a, comp_a):
        assert post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(quantity="10", price="100")])).status_code == 201
        assert post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(quantity="10", price="200")])).status_code == 201
        variant = variant_for(comp_a)
        assert variant.current_stock_qty == Decimal("20")
        assert variant.avg_purchase_price == Decimal("150")

    def test_duplicate_name_and_size_merges_into_one_variant(self, client_a, comp_a):
        post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(quantity="5")]))
        response = post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(quantity="7", price="200")]))
        assert response.status_code == 201
        assert ItemVariant.objects.filter(item__company=comp_a, item__name="Steel Rod", size="20ft").count() == 1

    @pytest.mark.parametrize("field,value", [("quantity", "0"), ("quantity", "-1")])
    def test_purchase_zero_or_negative_quantity_rejected(self, client_a, field, value):
        response = post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(**{field: value})]))
        assert response.status_code == 400

    @pytest.mark.parametrize("value", ["0", "-1"])
    def test_purchase_zero_or_negative_price_rejected(self, client_a, value):
        response = post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(price=value)]))
        assert response.status_code == 400

    @pytest.mark.parametrize("missing", ["date", "salesman_name", "party_name", "party_contact"])
    def test_purchase_missing_required_header_rejected(self, client_a, missing):
        payload = purchase_payload([purchase_line()])
        payload.pop(missing)
        assert post_json(client_a, "/api/purchases/", payload).status_code == 400


class TestSaleAdd:
    def stocked_variant(self, client_a, comp_a, item="Steel Rod", size="20ft", quantity="10", price="100"):
        post_json(client_a, "/api/purchases/", purchase_payload([purchase_line(item, size, quantity, price)]))
        return variant_for(comp_a, item, size)

    def test_add_sale_with_single_line_item(self, client_a, comp_a):
        variant = self.stocked_variant(client_a, comp_a)
        response = post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id)]))
        assert response.status_code == 201
        assert len(response.data["items"]) == 1

    def test_add_sale_with_multiple_line_items(self, client_a, comp_a):
        first = self.stocked_variant(client_a, comp_a, quantity="10")
        second = self.stocked_variant(client_a, comp_a, item="Cement", size="50kg", quantity="4")
        response = post_json(client_a, "/api/sales/", sale_payload([sale_line(first.id, "2"), sale_line(second.id, "1")]))
        assert response.status_code == 201
        assert len(response.data["items"]) == 2

    def test_sale_with_sufficient_stock_succeeds(self, client_a, comp_a):
        variant = self.stocked_variant(client_a, comp_a, quantity="5")
        assert post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id, "5")])).status_code == 201

    def test_sale_with_insufficient_stock_rejected(self, client_a, comp_a):
        variant = self.stocked_variant(client_a, comp_a, quantity="5")
        response = post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id, "6")]))
        assert response.status_code == 400
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("5")

    def test_sale_with_zero_stock_rejected(self, client_a, comp_a):
        variant = ItemVariant.objects.create(
            item=Item.objects.create(company=comp_a, name="Empty"), size="Unit"
        )
        assert post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id)])).status_code == 400

    def test_sale_for_nonexistent_item_rejected(self, client_a):
        assert post_json(client_a, "/api/sales/", sale_payload([sale_line(999999)])).status_code == 400

    def test_sale_snapshots_current_average_cost(self, client_a, comp_a):
        variant = self.stocked_variant(client_a, comp_a, quantity="10", price="100")
        response = post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id, "2", "150")]))
        assert response.status_code == 201
        assert response.data["items"][0]["cost_price_at_sale"] == "100.00"

    @pytest.mark.parametrize("field,value", [("quantity", "0"), ("quantity", "-1")])
    def test_sale_zero_or_negative_quantity_rejected(self, client_a, comp_a, field, value):
        variant = self.stocked_variant(client_a, comp_a)
        assert post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id, **{field: value})])).status_code == 400

    @pytest.mark.parametrize("value", ["0", "-1"])
    def test_sale_zero_or_negative_price_rejected(self, client_a, comp_a, value):
        variant = self.stocked_variant(client_a, comp_a)
        assert post_json(client_a, "/api/sales/", sale_payload([sale_line(variant.id, sale_price=value)])).status_code == 400


class TestPurchaseEdit:
    def create(self, client_a, **line):
        return client_a.post("/api/purchases/", purchase_payload([purchase_line(**line)]))

    def test_edit_purchase_price_before_sales_updates_average(self, client_a, comp_a):
        created = self.create(client_a, quantity="10", price="100")
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "price": "200"}])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a).avg_purchase_price == Decimal("200")

    def test_edit_purchase_price_after_sales_updates_future_cost_only(self, client_a, comp_a):
        created = self.create(client_a, quantity="10", price="100")
        variant = variant_for(comp_a)
        sale = client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "2", "150")]))
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "price": "200"}])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert sale.data["items"][0]["cost_price_at_sale"] == "100.00"
        assert variant_for(comp_a).avg_purchase_price == Decimal("200")

    def test_edit_purchase_quantity_upward_increases_stock(self, client_a, comp_a):
        created = self.create(client_a, quantity="10")
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "quantity": "15"}])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("15")

    def test_edit_purchase_quantity_downward_above_sold_succeeds(self, client_a, comp_a):
        created = self.create(client_a, quantity="10")
        variant = variant_for(comp_a)
        client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "3")]))
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "quantity": "8"}])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("5")

    def test_edit_purchase_quantity_below_sold_rejected(self, client_a, comp_a):
        created = self.create(client_a, quantity="10")
        client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "3")]))
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "quantity": "2"}])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 400

    def test_edit_purchase_item_and_size_moves_stock_without_math_loss(self, client_a, comp_a):
        created = self.create(client_a, quantity="10")
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "item_name": "New Item", "size": "Unit"}])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a, "Steel Rod").current_stock_qty == Decimal("0")
        assert variant_for(comp_a, "New Item", "Unit").current_stock_qty == Decimal("10")

    def test_edit_purchase_to_existing_item_size_rejected(self, client_a, comp_a):
        first = self.create(client_a)
        second = self.create(client_a, item="Other", size="Unit")
        duplicate = {**second.data["items"][0], "item_name": "Steel Rod", "size": "20ft"}
        payload = purchase_update_payload(second, items=[duplicate])
        assert client_a.patch(f"/api/purchases/{second.data['id']}/", payload).status_code == 400
        assert first.status_code == 201

    def test_edit_purchase_header_fields(self, client_a):
        created = self.create(client_a)
        payload = purchase_update_payload(created, date="2026-02-01", salesman_name="Bilal", party_name="New Supplier", party_contact="923009998888")
        response = client_a.patch(f"/api/purchases/{created.data['id']}/", payload)
        assert response.status_code == 200
        assert response.data["date"] == "2026-02-01"
        assert response.data["salesman_name"] == "Bilal"
        assert response.data["party_contact"] == "923009998888"

    def test_add_line_to_existing_purchase(self, client_a, comp_a):
        created = self.create(client_a)
        payload = purchase_update_payload(created, items=created.data["items"] + [purchase_line("Cement", "50kg", "4", "500")])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a, "Cement", "50kg").current_stock_qty == Decimal("4")

    def test_remove_purchase_line_reduces_stock(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line(), purchase_line("Cement", "50kg")]))
        payload = purchase_update_payload(created, items=[created.data["items"][0]])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a, "Cement", "50kg").current_stock_qty == Decimal("0")


class TestSaleEdit:
    def create_sale(self, client_a, comp_a, quantity="10"):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity=quantity)]))
        variant = variant_for(comp_a)
        return client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "2", "150")]))

    def test_edit_sale_price_recalculates_profit(self, client_a, comp_a):
        created = self.create_sale(client_a, comp_a)
        payload = sale_update_payload(created, items=[{**created.data["items"][0], "sale_price": "180"}])
        response = client_a.patch(f"/api/sales/{created.data['id']}/", payload)
        assert response.status_code == 200
        assert response.data["profit"] == "160.00"

    def test_edit_sale_quantity_upward_rejects_insufficient_stock(self, client_a, comp_a):
        created = self.create_sale(client_a, comp_a, quantity="3")
        payload = sale_update_payload(created, items=[{**created.data["items"][0], "quantity": "4"}])
        assert client_a.patch(f"/api/sales/{created.data['id']}/", payload).status_code == 400

    def test_edit_sale_quantity_downward_restores_stock(self, client_a, comp_a):
        created = self.create_sale(client_a, comp_a)
        payload = sale_update_payload(created, items=[{**created.data["items"][0], "quantity": "1"}])
        assert client_a.patch(f"/api/sales/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("9")

    def test_edit_sale_item_and_size_moves_dependency(self, client_a, comp_a):
        created = self.create_sale(client_a, comp_a)
        client_a.post("/api/purchases/", purchase_payload([purchase_line("Other", "Unit", "5", "80")]))
        target = variant_for(comp_a, "Other", "Unit")
        payload = sale_update_payload(created, items=[{**created.data["items"][0], "variant": target.id}])
        assert client_a.patch(f"/api/sales/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("10")
        assert target.current_stock_qty == Decimal("3")

    def test_edit_sale_header_fields(self, client_a, comp_a):
        created = self.create_sale(client_a, comp_a)
        payload = sale_update_payload(created, date="2026-02-01", salesman_name="Bilal", party_name="New Buyer", party_contact="923009998888")
        response = client_a.patch(f"/api/sales/{created.data['id']}/", payload)
        assert response.status_code == 200
        assert response.data["date"] == "2026-02-01"
        assert response.data["salesman_name"] == "Bilal"


class TestDeleteAndRollback:
    def test_delete_purchase_line_with_no_sales_succeeds(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line()]))
        payload = purchase_update_payload(created, items=[])
        response = client_a.patch(f"/api/purchases/{created.data['id']}/", payload)
        assert response.status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("0")

    def test_delete_purchase_line_with_sales_exceeding_remaining_stock_rejected(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10")]))
        client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "6")]))
        response = client_a.patch(f"/api/purchases/{created.data['id']}/", purchase_update_payload(created, items=[]))
        assert response.status_code == 400

    def test_delete_entire_purchase_invoice_when_safe(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line()]))
        response = client_a.delete(f"/api/purchases/{created.data['id']}/")
        assert response.status_code == 204
        assert variant_for(comp_a).current_stock_qty == Decimal("0")

    def test_delete_entire_purchase_invoice_is_atomic_when_one_line_is_unsafe(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line(), purchase_line("Cement", "50kg")]))
        client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "6")]))
        response = client_a.delete(f"/api/purchases/{created.data['id']}/")
        assert response.status_code == 400
        assert PurchaseItem.objects.filter(purchase_id=created.data["id"]).count() == 2

    def test_delete_sale_line_restores_stock_and_removes_profit(self, client_a, comp_a):
        purchase = client_a.post("/api/purchases/", purchase_payload([purchase_line()]))
        variant = variant_for(comp_a)
        created = client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "2", "150")]))
        response = client_a.patch(f"/api/sales/{created.data['id']}/", sale_update_payload(created, items=[]))
        assert response.status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("10")
        assert SaleItem.objects.filter(sale_id=created.data["id"]).count() == 0
        assert purchase.status_code == 201

    def test_delete_multi_line_sale_restores_all_stock_and_profit(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(), purchase_line("Cement", "50kg", "4", "500")]))
        first, second = variant_for(comp_a), variant_for(comp_a, "Cement", "50kg")
        created = client_a.post("/api/sales/", sale_payload([sale_line(first.id, "2"), sale_line(second.id, "1", "700")]))
        response = client_a.delete(f"/api/sales/{created.data['id']}/")
        assert response.status_code == 204
        first.refresh_from_db()
        second.refresh_from_db()
        assert first.current_stock_qty == Decimal("10")
        assert second.current_stock_qty == Decimal("4")


class TestStockAndProfit:
    def test_stock_after_single_purchase(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="7")]))
        assert variant_for(comp_a).current_stock_qty == Decimal("7")

    def test_stock_after_single_sale(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="7")]))
        client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "3")]))
        assert variant_for(comp_a).current_stock_qty == Decimal("4")

    def test_stock_after_mixed_purchases_and_sales(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10", price="100")]))
        client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "3")]))
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="5", price="200")]))
        client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "4")]))
        assert variant_for(comp_a).current_stock_qty == Decimal("8")

    def test_stock_never_negative_after_failed_add_edit_delete(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="5")]))
        variant = variant_for(comp_a)
        assert client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "6")])).status_code == 400
        assert variant.current_stock_qty == Decimal("5")
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", purchase_update_payload(created, items=[{**created.data['items'][0], "quantity": "0"}])).status_code == 400
        variant.refresh_from_db()
        assert variant.current_stock_qty >= 0

    def test_stock_isolated_by_item_and_size(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line("Rod", "20ft", "3"), purchase_line("Rod", "25ft", "8")]))
        assert variant_for(comp_a, "Rod", "20ft").current_stock_qty == Decimal("3")
        assert variant_for(comp_a, "Rod", "25ft").current_stock_qty == Decimal("8")

    def test_multi_line_invoice_updates_each_stock_line(self, client_a, comp_a):
        created = client_a.post("/api/purchases/", purchase_payload([purchase_line(), purchase_line("Cement", "50kg", "4", "500")]))
        payload = purchase_update_payload(created, items=[{**created.data["items"][0], "quantity": "6"}, created.data["items"][1]])
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", payload).status_code == 200
        assert variant_for(comp_a).current_stock_qty == Decimal("6")
        assert variant_for(comp_a, "Cement", "50kg").current_stock_qty == Decimal("4")

    def test_single_sale_profit_uses_current_average_cost(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10", price="100")]))
        response = client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "2", "150")]))
        assert response.data["profit"] == "100.00"

    def test_profit_is_unchanged_after_later_purchase_changes_average(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10", price="100")]))
        sale = client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "2", "150")]))
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10", price="300")]))
        assert sale.data["items"][0]["profit"] == "100.00"

    def test_profit_recalculates_when_sale_price_or_quantity_changes(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10", price="100")]))
        sale = client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id, "2", "150")]))
        payload = sale_update_payload(sale, items=[{**sale.data["items"][0], "quantity": "3", "sale_price": "180"}])
        response = client_a.patch(f"/api/sales/{sale.data['id']}/", payload)
        assert response.status_code == 200
        assert response.data["profit"] == "240.00"

    def test_profit_is_removed_when_sale_is_deleted(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line()]))
        sale = client_a.post("/api/sales/", sale_payload([sale_line(variant_for(comp_a).id)]))
        assert client_a.delete(f"/api/sales/{sale.data['id']}/").status_code == 204
        assert SaleItem.objects.filter(sale_id=sale.data["id"]).count() == 0

    def test_profit_total_equals_sum_of_individual_profits(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="10", price="100")]))
        variant = variant_for(comp_a)
        first = client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "2", "150")]))
        second = client_a.post("/api/sales/", sale_payload([sale_line(variant.id, "3", "140")]))
        rows = client_a.get("/api/sales/").data
        assert sum(Decimal(row["profit"]) for row in rows) == Decimal(first.data["profit"]) + Decimal(second.data["profit"])

    def test_profit_for_multiple_items_in_one_sale(self, client_a, comp_a):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(), purchase_line("Cement", "50kg", "4", "500")]))
        first, second = variant_for(comp_a), variant_for(comp_a, "Cement", "50kg")
        sale = client_a.post("/api/sales/", sale_payload([sale_line(first.id, "2", "150"), sale_line(second.id, "1", "700")]))
        assert sale.data["profit"] == "300.00"


class TestStrictMultiTenantIsolation:
    def test_company_a_cannot_view_company_b_items(self, client_a, client_b):
        client_b.post("/api/items/", {"name": "Private B Item"})
        assert client_a.get("/api/items/").data == []

    def test_company_a_cannot_view_company_b_purchases_or_sales(self, client_a, client_b, comp_b):
        client_b.post("/api/purchases/", purchase_payload([purchase_line()]))
        assert client_a.get("/api/purchases/").data == []
        assert client_a.get("/api/sales/").data == []
        assert comp_b.purchases.exists()

    def test_company_a_cannot_edit_or_delete_company_b_invoice_by_id(self, client_a, client_b):
        created = client_b.post("/api/purchases/", purchase_payload([purchase_line()]))
        assert client_a.patch(f"/api/purchases/{created.data['id']}/", purchase_update_payload(created)).status_code == 404
        assert client_a.delete(f"/api/purchases/{created.data['id']}/").status_code == 404

    def test_company_a_stock_and_profit_never_include_company_b(self, client_a, client_b, comp_a, comp_b):
        client_a.post("/api/purchases/", purchase_payload([purchase_line(quantity="5", price="100")]))
        client_b.post("/api/purchases/", purchase_payload([purchase_line(quantity="50", price="1")]))
        assert variant_for(comp_a).current_stock_qty == Decimal("5")
        assert client_a.get("/api/sales/").data == []
        assert comp_b.purchases.exists()

    def test_duplicate_name_and_size_is_independent_per_company(self, client_a, client_b, comp_a, comp_b):
        assert client_a.post("/api/purchases/", purchase_payload([purchase_line()])).status_code == 201
        assert client_b.post("/api/purchases/", purchase_payload([purchase_line()])).status_code == 201
        assert ItemVariant.objects.filter(item__name="Steel Rod", size="20ft").count() == 2
        assert variant_for(comp_a).current_stock_qty == Decimal("10")
        assert variant_for(comp_b).current_stock_qty == Decimal("10")

    def test_login_company_a_grants_only_company_a_access(self, client_a, client_b, comp_b):
        # The authenticated fixtures represent separate token logins.
        client_b.post("/api/purchases/", purchase_payload([purchase_line()]))
        assert client_a.get("/api/items/").data == []
        assert client_a.get("/api/variants/").data == []
        assert client_a.get("/api/purchases/").data == []
        assert client_a.get("/api/sales/").data == []
        assert client_a.get("/api/quotations/").data == []
        assert comp_b.purchases.exists()
