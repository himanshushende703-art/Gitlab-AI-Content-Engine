"""
auth/email_utils.py
---------------------
Sends the signup verification code by email.

CONFIGURING REAL EMAIL DELIVERY:
Add these to backend/.env:
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USERNAME=you@gmail.com
    SMTP_PASSWORD=your-app-password      (Gmail: use an "App Password", not your normal password)
    SMTP_FROM=you@gmail.com

WITHOUT SMTP CONFIGURED (local dev default):
The code is printed to the backend console and written to audit.log
instead of emailed, so you can still test the signup flow without
setting up a mail server. Look for a line like:
    [DEV EMAIL] Verification code for someone@example.com: 123456
"""

import os
import smtplib
from email.mime.text import MIMEText

from database.audit_log import log_event

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USERNAME)


def send_verification_code(email: str, code: str) -> None:
    if not (SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD):
        # Dev fallback: no mail server configured, so just log it.
        print(f"[DEV EMAIL] Verification code for {email}: {code}")
        log_event("verification_code_logged_dev_mode", job_id=None, email=email)
        return

    message = MIMEText(
        f"Your verification code is: {code}\n\nThis code expires in 15 minutes."
    )
    message["Subject"] = "Your verification code"
    message["From"] = SMTP_FROM
    message["To"] = email

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [email], message.as_string())
