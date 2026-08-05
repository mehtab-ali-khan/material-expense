import pytest
from decimal import Decimal
from rest_framework.test import APIClient

from api.models import (
    Company,
    CompanyToken,
    Item,
    ItemVariant,
    Salesman,
    Purchase,
    Sale,
)


@pytest.fixture
def make_company(db):
    """Factory fixture: creates a Company + CompanyToken + authenticated APIClient."""

    def _make(name, phone, password="testpass123"):
        company = Company(name=name, phone=phone, first_name="Test", last_name="Co")
        company.set_password(password)
        company.save()
        token = CompanyToken.objects.create(company=company)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
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
        return company, token, client

    return _make


@pytest.fixture
def company_a(make_company):
    return make_company("Alpha Traders", "923001111111")


@pytest.fixture
def company_b(make_company):
    return make_company("Beta Supplies", "923002222222")


@pytest.fixture
def client_a(company_a):
    return company_a[2]


@pytest.fixture
def client_b(company_b):
    return company_b[2]


@pytest.fixture
def comp_a(company_a):
    return company_a[0]


@pytest.fixture
def comp_b(company_b):
    return company_b[0]


@pytest.fixture
def make_purchase_payload():
    def _make(
        item_name="Steel Rod",
        size="20ft",
        quantity="10",
        price="100",
        date="2026-01-01",
        salesman_name="",
        party_name="Default Supplier",
        party_contact="923001110000",
    ):
        return {
            "items": [
                {
                    "item_name": item_name,
                    "size": size,
                    "quantity": quantity,
                    "price": price,
                }
            ],
            "date": date,
            "salesman_name": salesman_name,
            "party_name": party_name,
            "party_contact": party_contact,
        }

    return _make


@pytest.fixture
def make_sale_payload():
    def _make(
        variant_id,
        quantity="1",
        sale_price="100",
        date="2026-01-02",
        salesman_name="",
        party_name="Default Buyer",
        party_contact="923002220000",
    ):
        return {
            "items": [
                {
                    "variant": variant_id,
                    "quantity": quantity,
                    "sale_price": sale_price,
                }
            ],
            "date": date,
            "salesman_name": salesman_name,
            "party_name": party_name,
            "party_contact": party_contact,
        }

    return _make


@pytest.fixture
def variant_factory(db):
    """Directly create an Item + ItemVariant for a given company (bypassing the API)."""

    def _make(company, name="Steel Rod", size="20ft", price="0"):
        item, _ = Item.objects.get_or_create(company=company, name=name)
        variant, _ = ItemVariant.objects.get_or_create(
            item=item, size=size, price=price
        )
        return variant

    return _make
