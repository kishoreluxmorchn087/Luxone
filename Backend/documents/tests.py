from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase

from .serializers import DocumentCreateSerializer, DocumentUpdateSerializer


class DocumentRelatedIdValidationTests(SimpleTestCase):
    def test_create_rejects_negative_related_id_and_accepts_zero(self):
        for related_id, is_valid in [(-1, False), (0, True)]:
            with self.subTest(related_id=related_id):
                serializer = DocumentCreateSerializer(
                    data={
                        "title": "Test document",
                        "file": SimpleUploadedFile("test.txt", b"test"),
                        "related_module": "lead",
                        "related_id": related_id,
                    }
                )

                self.assertEqual(serializer.is_valid(), is_valid)
                if not is_valid:
                    self.assertIn("Linked record ID must be zero or greater.", str(serializer.errors))

    def test_update_rejects_negative_related_id(self):
        serializer = DocumentUpdateSerializer(data={"related_id": -1}, partial=True)

        self.assertFalse(serializer.is_valid())
        self.assertIn("Linked record ID must be zero or greater.", str(serializer.errors))
