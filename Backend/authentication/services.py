import secrets
import logging

from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from .models import OTP
from .otp_sender import send_otp_via_gmail

logger = logging.getLogger(__name__)

def generate_and_send_otp(email):
    email = email.strip().lower()
    # Invalidate previous OTPs for this email
    with transaction.atomic():
        OTP.objects.filter(email__iexact=email, is_verified=False).update(is_verified=True)

        # Generate 6 digit OTP
        code = f"{secrets.randbelow(900000) + 100000}"

        OTP.objects.create(email=email, code=code)

        success = send_otp_via_gmail(email, code)
        
        if not success:
            transaction.set_rollback(True)
            return False

        return True
