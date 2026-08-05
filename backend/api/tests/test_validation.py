"""
Auth flow tests: signup validation, password hashing/security,
duplicate-phone rejection, and login success/failure paths.
"""

import pytest
from rest_framework.test import APIClient

from api.models import Company, CompanyToken

pytestmark = pytest.mark.django_db


SIGNUP_URL = "/api/signup/"
LOGIN_URL = "/api/login/"


def signup_payload(**overrides):
    payload = {
        "name": "Alpha Traders",
        "password": "supersecret123",
        "first_name": "Ali",
        "last_name": "Khan",
        "phone": "923001111111",
    }
    payload.update(overrides)
    return payload


class TestSignup:
    def test_signup_creates_company(self):
        client = APIClient()
        res = client.post(SIGNUP_URL, signup_payload())
        assert res.status_code == 201
        assert Company.objects.filter(name="Alpha Traders").exists()

    def test_signup_hashes_password_not_stored_in_plaintext(self):
        client = APIClient()
        client.post(SIGNUP_URL, signup_payload())
        company = Company.objects.get(name="Alpha Traders")
        assert company.password != "supersecret123"
        assert company.check_password("supersecret123")

    def test_signup_response_never_exposes_raw_password(self):
        client = APIClient()
        res = client.post(SIGNUP_URL, signup_payload())
        assert "password" not in res.data

    def test_duplicate_phone_number_rejected(self):
        client = APIClient()
        client.post(
            SIGNUP_URL, signup_payload(name="Company One", phone="923005550000")
        )
        res = client.post(
            SIGNUP_URL, signup_payload(name="Company Two", phone="923005550000")
        )

        assert res.status_code == 400
        assert Company.objects.filter(phone="923005550000").count() == 1

    def test_duplicate_company_name_rejected(self):
        client = APIClient()
        client.post(SIGNUP_URL, signup_payload(name="Same Name", phone="923001112222"))
        res = client.post(
            SIGNUP_URL, signup_payload(name="Same Name", phone="923003334444")
        )

        assert res.status_code == 400
        assert Company.objects.filter(name="Same Name").count() == 1

    def test_phone_number_is_normalized_on_signup(self):
        client = APIClient()
        client.post(SIGNUP_URL, signup_payload(phone="0300-8253383"))
        company = Company.objects.get(name="Alpha Traders")
        assert company.phone == "03008253383"

    def test_signup_missing_required_field_rejected(self):
        client = APIClient()
        payload = signup_payload()
        del payload["phone"]
        res = client.post(SIGNUP_URL, payload)
        assert res.status_code == 400


class TestLogin:
    def _signup(self, client, **overrides):
        client.post(SIGNUP_URL, signup_payload(**overrides))

    def test_login_with_correct_credentials_returns_token(self):
        client = APIClient()
        self._signup(client, phone="923001234567", password="correcthorse")

        res = client.post(
            LOGIN_URL, {"phone": "923001234567", "password": "correcthorse"}
        )
        assert res.status_code == 200
        assert "token" in res.data
        assert CompanyToken.objects.filter(key=res.data["token"]).exists()

    def test_login_accepts_differently_formatted_phone_number(self):
        client = APIClient()
        self._signup(client, phone="923001234567", password="correcthorse")

        # signed up with bare digits, logging in with separators only
        res = client.post(
            LOGIN_URL, {"phone": "92300-1234567", "password": "correcthorse"}
        )
        assert res.status_code == 200

    def test_login_with_wrong_password_rejected(self):
        client = APIClient()
        self._signup(client, phone="923001234567", password="correcthorse")

        res = client.post(
            LOGIN_URL, {"phone": "923001234567", "password": "wrongpassword"}
        )
        assert res.status_code == 401
        assert "token" not in res.data

    def test_login_with_unknown_phone_rejected(self):
        client = APIClient()
        res = client.post(
            LOGIN_URL, {"phone": "923009999999", "password": "whatever123"}
        )
        assert res.status_code == 401

    def test_login_does_not_leak_whether_phone_exists(self):
        """Error message for wrong password vs unknown phone should be identical,
        so an attacker can't enumerate registered phone numbers."""
        client = APIClient()
        self._signup(client, phone="923001234567", password="correcthorse")

        res_wrong_password = client.post(
            LOGIN_URL, {"phone": "923001234567", "password": "wrongpassword"}
        )
        res_unknown_phone = client.post(
            LOGIN_URL, {"phone": "923009999999", "password": "whatever123"}
        )
        assert res_wrong_password.data.get("detail") == res_unknown_phone.data.get(
            "detail"
        )

    def test_login_issues_same_token_on_repeated_logins(self):
        """CompanyToken uses get_or_create, so logging in twice reuses one token."""
        client = APIClient()
        self._signup(client, phone="923001234567", password="correcthorse")

        res1 = client.post(
            LOGIN_URL, {"phone": "923001234567", "password": "correcthorse"}
        )
        res2 = client.post(
            LOGIN_URL, {"phone": "923001234567", "password": "correcthorse"}
        )

        assert res1.data["token"] == res2.data["token"]
        assert CompanyToken.objects.filter(company__phone="923001234567").count() == 1

    def test_token_authenticates_subsequent_requests(self):
        client = APIClient()
        self._signup(client, phone="923001234567", password="correcthorse")
        login_res = client.post(
            LOGIN_URL, {"phone": "923001234567", "password": "correcthorse"}
        )

        authed_client = APIClient()
        authed_client.credentials(HTTP_AUTHORIZATION=f"Token {login_res.data['token']}")
        res = authed_client.get("/api/me/")
        assert res.status_code == 200
        assert res.data["company_name"] == "Alpha Traders"
