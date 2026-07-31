"""
Edit (PATCH) tests for Purchase and Sale.

Core rules under test:
- Editing quantity/price recomputes stock/avg-price via a single net-delta
  adjustment (not a naive reverse-then-reapply), so increasing OR decreasing
  quantity both work correctly.
- Purchase edits that would drive stock negative (because sales already
  consumed that stock) are blocked with a 400.
- Sale edits preserve purchase_price_snapshot (cost basis doesn't drift).
- Sale edits that would oversell (qty increased beyond available stock)
  are blocked with a 400.
- item_name/length are immutable on edit even if sent in the payload.
- Edits are scoped per-company (404 across tenants).
"""

import pytest
from decimal import Decimal

from api.models import ItemVariant, Purchase, Sale

pytestmark = pytest.mark.django_db


class TestPurchaseEdit:
    def test_increasing_quantity_increases_stock_correctly(
        self, client_a, make_purchase_payload
    ):
        # Buy 100 @ 10, sell 50 -> stock = 50
        res = client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="100", price="10")
        )
        purchase_id = res.data["id"]
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "50",
                "sale_price": "20",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("50")

        # Edit purchase 100 -> 150. Net effect: stock 50 - 100 + 150 = 100
        res = client_a.patch(f"/api/purchases/{purchase_id}/", {"quantity": "150"})
        assert res.status_code == 200

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("100")
        assert variant.total_purchased_qty == Decimal("150")
        assert variant.total_purchased_value == Decimal("1500")

    def test_decreasing_quantity_decreases_stock_correctly(
        self, client_a, make_purchase_payload
    ):
        res = client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="100", price="10")
        )
        purchase_id = res.data["id"]
        variant = ItemVariant.objects.get(item__name="Steel Rod")

        # No sales yet, safe to decrease 100 -> 40
        res = client_a.patch(f"/api/purchases/{purchase_id}/", {"quantity": "40"})
        assert res.status_code == 200

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("40")
        assert variant.total_purchased_qty == Decimal("40")
        assert variant.total_purchased_value == Decimal("400")

    def test_decreasing_quantity_below_already_sold_amount_is_blocked(
        self, client_a, make_purchase_payload
    ):
        res = client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="100", price="10")
        )
        purchase_id = res.data["id"]
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "50",
                "sale_price": "20",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        # stock = 50. Editing qty 100 -> 30 would need stock 50-100+30 = -20 -> blocked
        res = client_a.patch(f"/api/purchases/{purchase_id}/", {"quantity": "30"})
        assert res.status_code == 400

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("50")  # unchanged
        purchase = Purchase.objects.get(id=purchase_id)
        assert purchase.quantity == Decimal("100")  # unchanged

    def test_editing_price_recomputes_weighted_average(
        self, client_a, make_purchase_payload
    ):
        res = client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="10")
        )
        purchase_id = res.data["id"]
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        assert variant.avg_purchase_price == Decimal("10")

        res = client_a.patch(f"/api/purchases/{purchase_id}/", {"price": "20"})
        assert res.status_code == 200

        variant.refresh_from_db()
        assert variant.avg_purchase_price == Decimal("20")
        assert variant.total_purchased_value == Decimal("200")

    def test_item_and_length_are_immutable_on_edit(
        self, client_a, make_purchase_payload
    ):
        res = client_a.post(
            "/api/purchases/",
            make_purchase_payload(item_name="Steel Rod", length="20ft"),
        )
        purchase_id = res.data["id"]
        original_variant_id = Purchase.objects.get(id=purchase_id).variant_id

        # attempt to change item/length via edit -- should simply be ignored
        res = client_a.patch(
            f"/api/purchases/{purchase_id}/",
            {
                "item_name": "Totally Different Item",
                "length": "999ft",
                "quantity": "12",
            },
        )
        assert res.status_code == 200

        purchase = Purchase.objects.get(id=purchase_id)
        assert purchase.variant_id == original_variant_id
        assert purchase.variant.item.name == "Steel Rod"
        assert purchase.variant.length == "20ft"
        assert purchase.quantity == Decimal("12")  # the allowed field did update

    def test_editing_salesman_and_party_updates_relations(
        self, client_a, make_purchase_payload
    ):
        res = client_a.post(
            "/api/purchases/", make_purchase_payload(salesman_name="Ali")
        )
        purchase_id = res.data["id"]

        res = client_a.patch(
            f"/api/purchases/{purchase_id}/",
            {
                "salesman_name": "Bilal",
                "party_name": "New Supplier",
                "party_contact": "923009998888",
            },
        )
        assert res.status_code == 200
        assert res.data["salesman_name"] == "Bilal"
        assert res.data["party_name"] == "New Supplier"
        assert res.data["party_contact"] == "923009998888"

    def test_edit_scoped_per_company_returns_404_for_other_company(
        self, client_a, client_b, make_purchase_payload
    ):
        res = client_a.post("/api/purchases/", make_purchase_payload())
        purchase_id = res.data["id"]

        res = client_b.patch(f"/api/purchases/{purchase_id}/", {"quantity": "5"})
        assert res.status_code == 404

        # original untouched
        purchase = Purchase.objects.get(id=purchase_id)
        assert purchase.quantity == Decimal("10")


class TestSaleEdit:
    def test_increasing_sale_quantity_decreases_stock_correctly(
        self, client_a, make_purchase_payload
    ):
        # Buy 100, sell 50 -> stock 50
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="100", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "50",
                "sale_price": "20",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("50")

        # Edit sale qty 50 -> 70. Net effect: stock 50 + 50 - 70 = 30
        res = client_a.patch(f"/api/sales/{sale_id}/", {"quantity": "70"})
        assert res.status_code == 200

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("30")

    def test_decreasing_sale_quantity_increases_stock_correctly(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="100", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "50",
                "sale_price": "20",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]

        res = client_a.patch(f"/api/sales/{sale_id}/", {"quantity": "20"})
        assert res.status_code == 200

        variant.refresh_from_db()
        # stock 50 + 50 - 20 = 80
        assert variant.current_stock_qty == Decimal("80")

    def test_increasing_sale_quantity_beyond_available_stock_is_blocked(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="100", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "50",
                "sale_price": "20",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]
        # stock = 50. Editing qty 50 -> 200 needs stock 50+50-200 = -100 -> blocked
        res = client_a.patch(f"/api/sales/{sale_id}/", {"quantity": "200"})
        assert res.status_code == 400

        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("50")  # unchanged
        sale = Sale.objects.get(id=sale_id)
        assert sale.quantity == Decimal("50")  # unchanged

    def test_editing_sale_price_or_quantity_preserves_purchase_price_snapshot(
        self, client_a, make_purchase_payload
    ):
        # avg = 100 at time of sale
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="100")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "2",
                "sale_price": "150",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]
        sale = Sale.objects.get(id=sale_id)
        assert sale.purchase_price_snapshot == Decimal("100")

        # avg price shifts due to a new purchase
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="300")
        )
        variant.refresh_from_db()
        assert variant.avg_purchase_price != Decimal("100")

        # editing the sale's quantity/price should NOT re-snapshot
        res = client_a.patch(
            f"/api/sales/{sale_id}/", {"quantity": "3", "sale_price": "180"}
        )
        assert res.status_code == 200

        sale.refresh_from_db()
        assert sale.purchase_price_snapshot == Decimal("100")  # unchanged
        assert sale.quantity == Decimal("3")
        assert sale.sale_price == Decimal("180")
        assert sale.profit == (Decimal("180") - Decimal("100")) * Decimal("3")

    def test_item_and_length_are_read_only_in_sale_response_on_edit(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/",
            make_purchase_payload(item_name="Steel Rod", length="20ft"),
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "150",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]

        # try to smuggle a different variant id in — should be ignored
        other_res = client_a.post(
            "/api/purchases/",
            make_purchase_payload(item_name="Other Item", length="5ft"),
        )
        other_variant = ItemVariant.objects.get(item__name="Other Item")

        res = client_a.patch(
            f"/api/sales/{sale_id}/", {"variant": other_variant.id, "quantity": "1"}
        )
        assert res.status_code == 200

        sale = Sale.objects.get(id=sale_id)
        assert sale.variant_id == variant.id  # unchanged, ignored the smuggled id
        assert res.data["item_name"] == "Steel Rod"
        assert res.data["length"] == "20ft"

    def test_editing_salesman_and_party_updates_relations(
        self, client_a, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "20",
                "date": "2026-01-02",
                "salesman_name": "Ali",
                "party_name": "Old Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]

        res = client_a.patch(
            f"/api/sales/{sale_id}/",
            {
                "salesman_name": "Zara",
                "party_name": "New Buyer",
                "party_contact": "923009991111",
            },
        )
        assert res.status_code == 200
        assert res.data["salesman_name"] == "Zara"
        assert res.data["party_name"] == "New Buyer"
        assert res.data["party_contact"] == "923009991111"

    def test_edit_scoped_per_company_returns_404_for_other_company(
        self, client_a, client_b, make_purchase_payload
    ):
        client_a.post(
            "/api/purchases/", make_purchase_payload(quantity="10", price="10")
        )
        variant = ItemVariant.objects.get(item__name="Steel Rod")
        res = client_a.post(
            "/api/sales/",
            {
                "variant": variant.id,
                "quantity": "1",
                "sale_price": "20",
                "date": "2026-01-02",
                "party_name": "Buyer",
                "party_contact": "923000000001",
            },
        )
        sale_id = res.data["id"]

        res = client_b.patch(f"/api/sales/{sale_id}/", {"quantity": "5"})
        assert res.status_code == 404

        sale = Sale.objects.get(id=sale_id)
        assert sale.quantity == Decimal("1")
