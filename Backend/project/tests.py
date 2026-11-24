from django.test import TestCase
from accounts.models import Account
from contacts.models import Contact
from deals.models import Deal, DealStage
from .serializers import ProjectCreateUpdateSerializer, ProjectDetailSerializer


class ProjectRelationshipTests(TestCase):
    def setUp(self):
        self.account = Account.objects.create(account_name="Northwind")
        self.contact = Contact.objects.create(
            first_name="Ada",
            last_name="Lovelace",
            account=self.account,
        )
        self.deal = Deal.objects.create(
            deal_name="Northwind Renewal",
            account=self.account,
            contact=self.contact,
            stage=DealStage.objects.get_or_create(stage_name="Qualification")[0],
        )

    def test_selected_records_are_saved_and_returned_with_project(self):
        serializer = ProjectCreateUpdateSerializer(
            data={
                "project_code": "PRJ0001",
                "name": "Northwind rollout",
                "account": self.account.pk,
                "account_name": "Incorrect account label",
                "contact": self.contact.pk,
                "contact_name": "Incorrect contact label",
                "deal": self.deal.pk,
                "deal_name": "Incorrect deal label",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        project = serializer.save()

        self.assertEqual(project.account, self.account)
        self.assertEqual(project.contact, self.contact)
        self.assertEqual(project.deal, self.deal)
        self.assertEqual(project.account_name, "Northwind")
        self.assertEqual(project.contact_name, "Ada Lovelace")
        self.assertEqual(project.deal_name, "Northwind Renewal")

        detail = ProjectDetailSerializer(project).data
        self.assertEqual(detail["account"], self.account.pk)
        self.assertEqual(detail["contact"], self.contact.pk)
        self.assertEqual(detail["deal"], self.deal.pk)
        self.assertEqual(detail["account_name"], "Northwind")
        self.assertEqual(detail["contact_name"], "Ada Lovelace")
        self.assertEqual(detail["deal_name"], "Northwind Renewal")

        update_serializer = ProjectCreateUpdateSerializer(
            project,
            data={"account": None, "contact": None, "deal": None},
            partial=True,
        )
        self.assertTrue(update_serializer.is_valid(), update_serializer.errors)
        unlinked_project = update_serializer.save()
        self.assertEqual(unlinked_project.account_name, "")
        self.assertEqual(unlinked_project.contact_name, "")
        self.assertEqual(unlinked_project.deal_name, "")
