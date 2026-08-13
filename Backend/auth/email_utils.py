"""
auth/email_utils.py
---------------------
Sends the signup verification code by email, via Brevo's HTTPS API.

CONFIGURING REAL EMAIL DELIVERY:
Add these to Render's Environment tab (or backend/.env for local dev):
    BREVO_API_KEY=your-brevo-api-key
    BREVO_SENDER_EMAIL=your-verified-sender@email.com

WITHOUT BREVO_API_KEY CONFIGURED (local dev default):
The code is printed to the backend console and written to audit.log
instead of emailed, so you can still test the signup flow without
setting up email. Look for a line like:
    [DEV EMAIL] Verification code for someone@example.com: 123456
"""

import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from database.audit_log import log_event

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL")


def send_verification_code(email: str, code: str) -> None:
    if not (BREVO_API_KEY and BREVO_SENDER_EMAIL):
        # Dev fallback: no mail service configured, so just log it.
        print(f"[DEV EMAIL] Verification code for {email}: {code}")
        log_event("verification_code_logged_dev_mode", job_id=None, email=email)
        return

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    send_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"email": BREVO_SENDER_EMAIL},
        subject="Your verification code",
        text_content=f"Your verification code is: {code}\n\nThis code expires in 15 minutes.",
    )

    try:
        api_instance.send_transac_email(send_email)
        print(f"SUCCESS: Verification code sent to {email}")
    except ApiException as e:
        print(f"FAILED to send email: {e}")
