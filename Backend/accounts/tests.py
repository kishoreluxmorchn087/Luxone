from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from contacts.models import Contact
from deals.models import Deal, DealStage
from integrations.models import EmailProviderIntegration, SyncedEmailMessage
from inventory.models import Invoice, Quote, SalesOrder
from support.models import SupportCase

from .models import Account


class AccountRelatedModuleFlagsTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="account-related-modules@example.com",
            password="test-password",
            is_active=True,
            is_admin=True,
        )
        self.client.force_authenticate(self.user)
        self.account_with_records = Account.objects.create(
            account_name="Account with related records",
            account_owner=self.user,
        )
        self.account_without_records = Account.objects.create(
            account_name="Account without related records",
            account_owner=self.user,
        )

    def test_account_list_reports_related_module_records(self):
        Contact.objects.create(
            first_name="Related",
            last_name="Contact",
            account=self.account_with_records,
        )
        stage = DealStage.objects.create(stage_name="Related module test stage")
        Deal.objects.create(
            deal_name="Related deal",
            account=self.account_with_records,
            stage=stage,
        )
        SupportCase.objects.create(
            subject="Related case",
            account=self.account_with_records,
        )
        provider = EmailProviderIntegration.objects.create(
            provider_type=EmailProviderIntegration.ProviderType.GMAIL,
            protocol_type=EmailProviderIntegration.ProtocolType.IMAP,
            email_address="related@example.com",
        )
        SyncedEmailMessage.objects.create(
            provider_integration=provider,
            external_message_id="related-email",
            subject="Related email",
            from_email="sender@example.com",
            direction=SyncedEmailMessage.Direction.INCOMING,
            status=SyncedEmailMessage.Status.RECEIVED,
            received_at=timezone.now(),
            account=self.account_with_records,
        )
        Quote.objects.create(subject="Related quote", account=self.account_with_records)
        SalesOrder.objects.create(
            subject="Related sales order",
            account=self.account_with_records,
        )
        Invoice.objects.create(subject="Related invoice", account=self.account_with_records)

        response = self.client.get("/api/accounts/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        accounts = {row["id"]: row for row in results}
        self.assertEqual(
            {
                key: accounts[self.account_with_records.pk][key]
                for key in (
                    "has_contacts",
                    "has_deals",
                    "has_cases",
                    "has_emails",
                    "has_invoices",
                    "has_quotes",
                    "has_sales_orders",
                )
            },
            {
                "has_contacts": True,
                "has_deals": True,
                "has_cases": True,
                "has_emails": True,
                "has_invoices": True,
                "has_quotes": True,
                "has_sales_orders": True,
            },
        )
        self.assertEqual(
            {
                key: accounts[self.account_without_records.pk][key]
                for key in (
                    "has_contacts",
                    "has_deals",
                    "has_cases",
                    "has_emails",
                    "has_invoices",
                    "has_quotes",
                    "has_sales_orders",
                )
            },
            {
                "has_contacts": False,
                "has_deals": False,
                "has_cases": False,
                "has_emails": False,
                "has_invoices": False,
                "has_quotes": False,
                "has_sales_orders": False,
            },
        )
