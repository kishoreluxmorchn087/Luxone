from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from .models import OTP
from .views import get_tenant_user_for_email


class TenantLookupTests(TestCase):
    @patch("authentication.views.configure_tenant_database_in_settings")
    @patch("authentication.views.User")
    @patch("authentication.views.Company")
    def test_get_tenant_user_for_email_configures_tenant_db_before_lookup(
        self,
        company_model,
        user_model,
        configure_tenant_database,
    ):
        from types import SimpleNamespace
        from unittest.mock import MagicMock

        company = SimpleNamespace(db_name="tenant_acme", status="Active")
        tenant_user = SimpleNamespace(email="client@example.com", is_active=True, is_admin=True)

        company_model.objects.filter.return_value = [company]
        queryset = MagicMock()
        queryset.filter.return_value = queryset
        queryset.first.return_value = tenant_user
        user_model.objects.using.return_value = queryset

        db_name, user = get_tenant_user_for_email("client@example.com")

        self.assertEqual(db_name, "tenant_acme")
        self.assertEqual(user, tenant_user)
        configure_tenant_database.assert_called_once_with("tenant_acme")
        user_model.objects.using.assert_called_once_with("tenant_acme")


class AuthenticationApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="client@example.com",
            password="StrongPass123",
            is_admin=True,
            is_active=True,
        )

    @patch("authentication.views.get_tokens_for_user")
    @patch("authentication.views.authenticate")
    @patch("authentication.views.get_tenant_user_for_email")
    def test_login_returns_tenant_context_for_client_credentials(
        self,
        tenant_lookup,
        mocked_authenticate,
        mocked_tokens,
    ):
        tenant_lookup.return_value = ("tenant_client_one", self.user)
        mocked_authenticate.return_value = self.user
        mocked_tokens.return_value = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
        }

        response = self.client.post(
            "/api/auth/login",
            {"email": "client@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["tenant_db"], "tenant_client_one")
        self.assertEqual(response.data["data"]["user"]["email"], "client@example.com")

    def test_change_password_rejects_incorrect_current_password(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "WrongPass123",
                "new_password": "NewStrongPass123",
                "confirm_password": "NewStrongPass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("StrongPass123"))

    @override_settings(DEFAULT_FROM_EMAIL="otp@crm.example", EMAIL_HOST_USER="emailapikey")
    @patch("authentication.services.send_mail")
    def test_forgot_password_uses_configured_sender_email(self, mocked_send_mail):
        response = self.client.post(
            "/api/auth/forgot-password",
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mocked_send_mail.assert_called_once()
        self.assertEqual(mocked_send_mail.call_args.args[2], "otp@crm.example")

    @patch("authentication.services.send_mail", side_effect=OSError("SMTP unavailable"))
    def test_forgot_password_rolls_back_otp_when_email_delivery_fails(self, mocked_send_mail):
        response = self.client.post(
            "/api/auth/forgot-password",
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(OTP.objects.filter(email=self.user.email).count(), 0)
        mocked_send_mail.assert_called_once()

    def test_change_password_updates_password_with_correct_current_password(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "StrongPass123",
                "new_password": "NewStrongPass123",
                "confirm_password": "NewStrongPass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass123"))
