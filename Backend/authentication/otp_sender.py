import smtplib
from email.mime.text import MIMEText
import logging

logger = logging.getLogger(__name__)

def send_otp_via_gmail(to_email, code):
    sender_email = "luxmoraicrm@gmail.com"
    
    # ⚠️ IMPORTANT: Replace this with your Google App Password. 
    # Regular Gmail passwords won't work due to 2FA restrictions.
    sender_password = "qgen yorj apgl aysi" 
    
    subject = "Your CRM Authentication OTP"
    body = f"Your OTP code is {code}. It is valid for 5 minutes."
    
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = to_email

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.exception(f"Failed to send OTP via custom Gmail package: {e}")
        return False
