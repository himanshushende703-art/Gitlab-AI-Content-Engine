"""
auth/email_utils.py
---------------------
Sends the signup verification code by email.

WHY RESEND (HTTP API) INSTEAD OF SMTP:
Render's free tier blocks outbound SMTP connections (ports 587/465) for
abuse prevention, so raw smtplib.SMTP(...) calls fail there with
"OSError: [Errno 101] Network is unreachable" even though the exact
same code works fine locally. Resend sends email over a normal HTTPS
API call (port 443), which Render does NOT block, so this works both
locally and in production without any code changes.

CONFIGURING REAL EMAIL DELIVERY:
1. Sign up for a free account at https://resend.com (3,000 emails/month free).
2. Create an API key: Dashboard -> API Keys -> Create API Key.
3. Add these to backend/.env (and to Render's Environment tab for prod):
    RESEND_API_KEY=re_your_api_key_here
    EMAIL_FROM=onboarding@resend.dev   (Resend's free shared sending domain;
                                         replace with your own verified domain
                                         once you add one in Resend)

WITHOUT RESEND_API_KEY CONFIGURED (local dev default):
The code is printed to the backend console and written to audit.log
instead of emailed, so you can still test the signup flow without
setting up email. Look for a line like:
    [DEV EMAIL] Verification code for someone@example.com: 123456
"""

import os

import requests

from database.audit_log import log_event

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
RESEND_API_URL = "https://api.resend.com/emails"


def _send_email(to_email: str, subject: str, body_text: str) -> None:
    """
    Shared helper: sends a plain-text email via the Resend HTTP API.
    Falls back to console/log output if RESEND_API_KEY isn't configured,
    so local development still works without any email setup.
    """
    if not RESEND_API_KEY:
        # Dev fallback: no email service configured, so just log it.
        print(f"[DEV EMAIL] To: {to_email} | Subject: {subject}\n{body_text}")
        log_event("email_logged_dev_mode", job_id=None, email=to_email)
        return

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body_text,
            },
            timeout=10,
        )
        response.raise_for_status()
        print(f"[EMAIL SENT] {subject} -> {to_email}")
    except requests.RequestException as exc:
        # Don't let an email-provider hiccup crash signup/login — log it
        # and let the caller decide whether to surface it to the user.
        print(f"[EMAIL FAILED] {subject} -> {to_email}: {exc}")
        log_event("email_send_failed", job_id=None, email=to_email, error=str(exc))
        raise


def send_verification_code(email: str, code: str) -> None:
    _send_email(
        to_email=email,
        subject="Your verification code",
        body_text=(
            f"Your verification code is: {code}\n\n"
            "This code expires in 15 minutes."
        ),
    )


def send_reset_email(email: str, reset_link: str) -> None:
    _send_email(
        to_email=email,
        subject="Reset Your Password",
        body_text=(
            "Please click this link to reset your password:\n\n"
            f"{reset_link}\n\n"
            "This link expires in 15 minutes."
        ),
    )