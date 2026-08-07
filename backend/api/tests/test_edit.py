"""
Edit (PATCH) tests for the current grouped purchase/sale invoice flow.
"""

from decimal import Decimal

import pytest

from api.models import ItemVariant, Party, PurchaseItem, SaleItem, Salesman

pytestmark = pytest.mark.django_db


def first_line(response):
    return response.data["items"][0]


def purchase_patch(response, **line_overrides):
    line = first_line(response)
    return {
        "items": [
            {
                "id": line["id"],
                "item_name": line["item_name"],
                "size": line["size"],
                "quantity": line["quantity"],
                "price": line["price"],
                **line_overrides,
            }
        ],
        "date": response.data["date"],
        "salesman_name": response.data.get("salesman_name") or "",
        "party_name": response.data["party_name"],
        "party_contact": response.data["party_contact"],
    }


def sale_patch(response, **line_overrides):
    line = first_line(response)
    return {
        "items": [
            {
                "id": line["id"],
                "variant": line["variant"],
                "quantity": line["quantity"],
                "sale_price": line["sale_price"],
                **line_overrides,
            }
        ],
        "date": response.data["date"],
        "salesman_name": response.data.get("salesman_name") or "",
        "party_name": response.data["party_name"],
        "party_contact": response.data["party_contact"],
    }


class TestPurchaseEdit:
    def test_multiline_edit_to_same_variant_preserves_all_stock(
        self, client_a, make_purchase_payload
    ):
        payload = make_purchase_payload(
            item_name="Rod", size="20ft", quantity="5", price="10"
        )
        payload["items"].append(
            {"item_name": "Cement", "size": "50kg", "quantity": "5", "price": "20"}
        )
        created = client_a.post("/api/purchases/", payload, format="json")
        line1, line2 = created.data["items"]

        edit_payload = {
            "items": [
                {
                    "id": line1["id"],
                    "item_name": "Cement",
                    "size": "50kg",
                    "quantity": "8",
                    "price": "20",
                },
                {
                    "id": line2["id"],
                    "item_name": "Cement",
                    "size": "50kg",
                    "quantity": "6",
                    "price": "20",
                },
            ],
            "date": created.data["date"],
            "salesman_name": created.data.get("salesman_name") or "",
            "party_name": created.data["party_name"],
            "party_contact": created.data["party_contact"],
        }

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/", edit_payload, format="json"
        )

        assert res.status_code == 200
        rod = ItemVariant.objects.get(item__name="Rod", price=Decimal("10"))
        cement = ItemVariant.objects.get(item__name="Cement", price=Decimal("20"))
        assert rod.current_stock_qty == Decimal("0")
        assert cement.current_stock_qty == Decimal("14")

    def test_partial_patch_can_update_date_without_items(
        self, client_a, make_purchase_payload
    ):
        created = client_a.post(
            "/api/purchases/", make_purchase_payload(), format="json"
        )

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/",
            {"date": "2026-02-01"},
            format="json",
        )

        assert res.status_code == 200
        assert res.data["date"] == "2026-02-01"
        assert len(res.data["items"]) == 1

    def test_header_creation_rolls_back_when_purchase_items_fail(
        self, client_a, comp_a, make_purchase_payload
    ):
        payload = make_purchase_payload(
            salesman_name="NewGuy",
            party_name="NewSupplier",
            party_contact="923001119999",
        )
        del payload["items"][0]["item_name"]

        res = client_a.post("/api/purchases/", payload, format="json")

        assert res.status_code == 400
        assert not Salesman.objects.filter(company=comp_a, name="NewGuy").exists()
        assert not Party.objects.filter(company=comp_a, name="NewSupplier").exists()

    def test_increasing_quantity_increases_stock_correctly(self, client_a, make_purchase_payload, make_sale_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(quantity="100", price="10"), format="json")
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))
        client_a.post("/api/sales/", make_sale_payload(variant.id, quantity="50", sale_price="20"), format="json")

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/",
            purchase_patch(created, quantity="150"),
            format="json",
        )

        assert res.status_code == 200
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("100")
        assert PurchaseItem.objects.get(id=first_line(created)["id"]).quantity == Decimal("150")

    def test_decreasing_quantity_decreases_stock_correctly(self, client_a, make_purchase_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(quantity="100", price="10"), format="json")
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/",
            purchase_patch(created, quantity="40"),
            format="json",
        )

        assert res.status_code == 200
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("40")
        assert PurchaseItem.objects.get(id=first_line(created)["id"]).quantity == Decimal("40")

    def test_decreasing_quantity_below_already_sold_amount_is_blocked(self, client_a, make_purchase_payload, make_sale_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(quantity="100", price="10"), format="json")
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))
        client_a.post("/api/sales/", make_sale_payload(variant.id, quantity="50", sale_price="20"), format="json")

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/",
            purchase_patch(created, quantity="30"),
            format="json",
        )

        assert res.status_code == 400
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("50")
        assert PurchaseItem.objects.get(id=first_line(created)["id"]).quantity == Decimal("100")

    def test_editing_price_moves_stock_to_price_specific_variant(self, client_a, make_purchase_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(quantity="10", price="10"), format="json")
        old_variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/",
            purchase_patch(created, price="20"),
            format="json",
        )

        assert res.status_code == 200
        old_variant.refresh_from_db()
        new_variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("20"))
        assert old_variant.current_stock_qty == Decimal("0")
        assert new_variant.current_stock_qty == Decimal("10")

    def test_item_and_size_can_move_when_stock_is_unsold(self, client_a, make_purchase_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(item_name="Steel Rod", size="20ft"), format="json")
        old_variant = ItemVariant.objects.get(item__name="Steel Rod")

        res = client_a.patch(
            f"/api/purchases/{created.data['id']}/",
            purchase_patch(created, item_name="Totally Different Item", size="999ft", quantity="12"),
            format="json",
        )

        assert res.status_code == 200
        old_variant.refresh_from_db()
        line = PurchaseItem.objects.get(id=first_line(created)["id"])
        assert old_variant.current_stock_qty == Decimal("0")
        assert line.variant.item.name == "Totally Different Item"
        assert line.variant.size == "999ft"
        assert line.quantity == Decimal("12")

    def test_editing_salesman_and_party_updates_relations(self, client_a, make_purchase_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(salesman_name="Ali"), format="json")
        payload = purchase_patch(created)
        payload.update(
            {
                "salesman_name": "Bilal",
                "party_name": "New Supplier",
                "party_contact": "923009998888",
            }
        )

        res = client_a.patch(f"/api/purchases/{created.data['id']}/", payload, format="json")

        assert res.status_code == 200
        assert res.data["salesman_name"] == "Bilal"
        assert res.data["party_name"] == "New Supplier"
        assert res.data["party_contact"] == "923009998888"

    def test_edit_scoped_per_company_returns_404_for_other_company(self, client_a, client_b, make_purchase_payload):
        created = client_a.post("/api/purchases/", make_purchase_payload(), format="json")

        res = client_b.patch(
            f"/api/purchases/{created.data['id']}/",
            purchase_patch(created, quantity="5"),
            format="json",
        )

        assert res.status_code == 404
        assert PurchaseItem.objects.get(id=first_line(created)["id"]).quantity == Decimal("10")


class TestSaleEdit:
    def create_sale(
        self,
        client_a,
        make_purchase_payload,
        make_sale_payload,
        purchase_quantity="100",
        sale_quantity="50",
    ):
        client_a.post("/api/purchases/", make_purchase_payload(quantity=purchase_quantity, price="10"), format="json")
        variant = ItemVariant.objects.get(item__name="Steel Rod", price=Decimal("10"))
        sale = client_a.post(
            "/api/sales/",
            make_sale_payload(variant.id, quantity=sale_quantity, sale_price="20"),
            format="json",
        )
        return sale, variant

    def test_increasing_sale_quantity_decreases_stock_correctly(self, client_a, make_purchase_payload, make_sale_payload):
        sale, variant = self.create_sale(client_a, make_purchase_payload, make_sale_payload)

        res = client_a.patch(
            f"/api/sales/{sale.data['id']}/",
            sale_patch(sale, quantity="70"),
            format="json",
        )

        assert res.status_code == 200
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("30")

    def test_replacing_line_with_new_line_on_same_variant_uses_restored_stock(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        sale, variant = self.create_sale(
            client_a,
            make_purchase_payload,
            make_sale_payload,
            purchase_quantity="7",
            sale_quantity="5",
        )
        payload = sale_patch(sale)
        payload["items"] = [
            {"variant": variant.id, "quantity": "3", "sale_price": "20"}
        ]

        res = client_a.patch(f"/api/sales/{sale.data['id']}/", payload, format="json")

        assert res.status_code == 200
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("4")

    def test_partial_patch_can_update_date_without_items(
        self, client_a, make_purchase_payload, make_sale_payload
    ):
        sale, _ = self.create_sale(client_a, make_purchase_payload, make_sale_payload)

        res = client_a.patch(
            f"/api/sales/{sale.data['id']}/",
            {"date": "2026-02-01"},
            format="json",
        )

        assert res.status_code == 200
        assert res.data["date"] == "2026-02-01"
        assert len(res.data["items"]) == 1

    def test_header_creation_rolls_back_when_sale_items_fail(
        self, client_a, comp_a, comp_b, variant_factory, make_sale_payload
    ):
        other_variant = variant_factory(comp_b, name="Other Company Item")
        payload = make_sale_payload(
            other_variant.id,
            salesman_name="NewSeller",
            party_name="NewBuyer",
            party_contact="923002229999",
        )

        res = client_a.post("/api/sales/", payload, format="json")

        assert res.status_code == 400
        assert not Salesman.objects.filter(company=comp_a, name="NewSeller").exists()
        assert not Party.objects.filter(company=comp_a, name="NewBuyer").exists()

    def test_decreasing_sale_quantity_increases_stock_correctly(self, client_a, make_purchase_payload, make_sale_payload):
        sale, variant = self.create_sale(client_a, make_purchase_payload, make_sale_payload)

        res = client_a.patch(
            f"/api/sales/{sale.data['id']}/",
            sale_patch(sale, quantity="20"),
            format="json",
        )

        assert res.status_code == 200
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("80")

    def test_increasing_sale_quantity_beyond_available_stock_is_blocked(self, client_a, make_purchase_payload, make_sale_payload):
        sale, variant = self.create_sale(client_a, make_purchase_payload, make_sale_payload)

        res = client_a.patch(
            f"/api/sales/{sale.data['id']}/",
            sale_patch(sale, quantity="200"),
            format="json",
        )

        assert res.status_code == 400
        variant.refresh_from_db()
        assert variant.current_stock_qty == Decimal("50")
        assert SaleItem.objects.get(id=first_line(sale)["id"]).quantity == Decimal("50")

    def test_editing_sale_price_or_quantity_preserves_cost_price_at_sale(self, client_a, make_purchase_payload, make_sale_payload):
        sale, variant = self.create_sale(
            client_a,
            make_purchase_payload,
            make_sale_payload,
            purchase_quantity="10",
            sale_quantity="2",
        )
        line = SaleItem.objects.get(id=first_line(sale)["id"])
        assert line.cost_price_at_sale == Decimal("10")

        client_a.post("/api/purchases/", make_purchase_payload(quantity="10", price="300"), format="json")
        res = client_a.patch(
            f"/api/sales/{sale.data['id']}/",
            sale_patch(sale, quantity="3", sale_price="180"),
            format="json",
        )

        assert res.status_code == 200
        line.refresh_from_db()
        assert line.cost_price_at_sale == Decimal("10")
        assert line.quantity == Decimal("3")
        assert line.sale_price == Decimal("180")
        assert line.profit == (Decimal("180") - Decimal("10")) * Decimal("3")

    def test_item_and_size_are_read_only_on_sale_edit(self, client_a, make_purchase_payload, make_sale_payload):
        sale, variant = self.create_sale(
            client_a,
            make_purchase_payload,
            make_sale_payload,
            purchase_quantity="10",
            sale_quantity="1",
        )
        client_a.post("/api/purchases/", make_purchase_payload(item_name="Other Item", size="5ft"), format="json")
        other_variant = ItemVariant.objects.get(item__name="Other Item")

        res = client_a.patch(
            f"/api/sales/{sale.data['id']}/",
            sale_patch(sale, variant=other_variant.id, quantity="1"),
            format="json",
        )

        assert res.status_code == 400
        line = SaleItem.objects.get(id=first_line(sale)["id"])
        assert line.variant_id == variant.id

    def test_editing_salesman_and_party_updates_relations(self, client_a, make_purchase_payload, make_sale_payload):
        sale, _ = self.create_sale(
            client_a,
            make_purchase_payload,
            make_sale_payload,
            purchase_quantity="10",
            sale_quantity="1",
        )
        payload = sale_patch(sale)
        payload.update(
            {
                "salesman_name": "Zara",
                "party_name": "New Buyer",
                "party_contact": "923009991111",
            }
        )

        res = client_a.patch(f"/api/sales/{sale.data['id']}/", payload, format="json")

        assert res.status_code == 200
        assert res.data["salesman_name"] == "Zara"
        assert res.data["party_name"] == "New Buyer"
        assert res.data["party_contact"] == "923009991111"

    def test_edit_scoped_per_company_returns_404_for_other_company(self, client_a, client_b, make_purchase_payload, make_sale_payload):
        sale, _ = self.create_sale(
            client_a,
            make_purchase_payload,
            make_sale_payload,
            purchase_quantity="10",
            sale_quantity="1",
        )

        res = client_b.patch(
            f"/api/sales/{sale.data['id']}/",
            sale_patch(sale, quantity="5"),
            format="json",
        )

        assert res.status_code == 404
        assert SaleItem.objects.get(id=first_line(sale)["id"]).quantity == Decimal("1")
