from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from project.models import Project

from .models import ProjectDeskMeeting, ProjectDeskMeetingParticipant


User = get_user_model()


class ProjectDeskMeetingMutationTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(
            email="projectdesk@example.com",
            password="test-password",
            name="ProjectDesk User",
            role="manager",
            department="sales",
            is_active=True,
        )
        self.client.force_authenticate(user)
        self.project = Project.objects.create(
            project_code="PD-TEST-001",
            name="ProjectDesk test project",
        )
        self.meeting = self.create_meeting("Original meeting")
        self.other_meeting = self.create_meeting("Other meeting")

    def create_meeting(self, title):
        return ProjectDeskMeeting.objects.create(
            project=self.project,
            title=title,
            meeting_type="Online",
            meeting_link="https://example.com/meeting",
            start_datetime=timezone.now() + timedelta(days=1),
        )

    def test_patch_and_delete_only_change_the_selected_meeting(self):
        url = f"/api/projectdesk/meetings/{self.meeting.id}/"

        update_response = self.client.patch(
            url,
            {"title": "Updated meeting"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.meeting.refresh_from_db()
        self.other_meeting.refresh_from_db()
        self.assertEqual(self.meeting.title, "Updated meeting")
        self.assertEqual(self.other_meeting.title, "Other meeting")

        delete_response = self.client.delete(url)

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProjectDeskMeeting.objects.filter(id=self.meeting.id).exists())
        self.assertTrue(
            ProjectDeskMeeting.objects.filter(id=self.other_meeting.id).exists()
        )

    def test_editing_participants_preserves_attendance_for_existing_participant(self):
        marked_at = timezone.now()
        ProjectDeskMeetingParticipant.objects.create(
            meeting=self.meeting,
            participant_name="Existing Participant",
            participant_email="existing@example.com",
            attendance_status="Attended",
            marked_at=marked_at,
        )

        response = self.client.patch(
            f"/api/projectdesk/meetings/{self.meeting.id}/",
            {
                "participant_entries": [
                    {
                        "name": "Existing Participant",
                        "email": "existing@example.com",
                    },
                    {"name": "New Participant", "email": ""},
                ]
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        preserved_participant = self.meeting.attendance_records.get(
            participant_email="existing@example.com"
        )
        self.assertEqual(preserved_participant.attendance_status, "Attended")
        self.assertEqual(preserved_participant.marked_at, marked_at)
        self.assertEqual(
            self.meeting.attendance_records.count(),
            2,
        )
