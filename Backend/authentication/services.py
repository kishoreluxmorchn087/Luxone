import secrets
import logging

from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from .models import OTP

logger = logging.getLogger(__name__)

def generate_and_send_otp(email):
    email = email.strip().lower()
    # Invalidate previous OTPs for this email
    with transaction.atomic():
        if settings.EMAIL_BACKEND.endswith("smtp.EmailBackend") and (
            not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD
        ):
            logger.error("OTP email delivery is not configured: SMTP credentials are missing")
            return False

        OTP.objects.filter(email__iexact=email, is_verified=False).update(is_verified=True)

        # Generate 6 digit OTP
        code = f"{secrets.randbelow(900000) + 100000}"

        OTP.objects.create(email=email, code=code)

        subject = "Your CRM Authentication OTP"
        message = f"Your OTP code is {code}. It is valid for 5 minutes."
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception:
            logger.exception("Failed to send OTP email to %s", email)
            transaction.set_rollback(True)
            return False

        return True
