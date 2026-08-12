"""
auth/accounts.py
------------------
Real email + password accounts, with email verification, on top of the
existing role system (auth/roles.py).

FLOW:
    1. POST /api/auth/signup   {email, password, role}
       -> creates an unverified account, emails a 6-digit code
          (see auth/email_utils.py), returns no token yet.
    2. POST /api/auth/verify   {email, code}
       -> marks the account verified, returns a session token.
    3. POST /api/auth/login    {email, password}
       -> only works once verified; returns a session token.

Passwords are hashed with PBKDF2-HMAC-SHA256 + a random per-user salt
(stdlib `hashlib`, no extra dependency needed). Verification codes are
hashed the same way and expire after 15 minutes.

After verify/login, the frontend gets back an opaque session token
(stored in the `session_tokens` table). Every subsequent request sends
that token as `Authorization: Bearer <token>`, and `get_current_user`
below looks it up to find who's making the request and what role they
have.
"""

import hashlib
import re
import secrets
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from auth.email_utils import send_verification_code
from auth.roles import CurrentUser, Role
from database.db import get_db
from database.models_db import SessionTokenDB, UserDB, VerificationCodeDB, PasswordResetDB

PBKDF2_ITERATIONS = 260_000
CODE_TTL_MINUTES = 15
RESET_TOKEN_TTL_MINUTES = 15
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _hash(value: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", value.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    ).hex()


def _hash_password(password: str) -> tuple[str, str]:
    salt = secrets.token_hex(16)
    return _hash(password, salt), salt


def _verify_password(password: str, salt: str, expected_hash: str) -> bool:
    return secrets.compare_digest(_hash(password, salt), expected_hash)


def signup(db: Session, email: str, password: str, role: Role) -> UserDB:
    email = email.strip().lower()
    
    # 1. Basic Validation
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # 2. Check if user already exists
    user = db.get(UserDB, email)
    password_hash, salt = _hash_password(password)

    if user is not None:
        if user.is_verified:
            # ONLY block them if they have actually verified their account
            raise HTTPException(status_code=409, detail="An account with this email already exists. Please log in.")
        else:
            # They didn't verify last time. Overwrite their details and send a new code.
            user.password_hash = password_hash
            user.password_salt = salt
            user.role = role.value
            db.commit()
            
            _issue_code(db, email)
            return user

    # 3. If they are completely new, create the account
    new_user = UserDB(
        email=email,
        password_hash=password_hash,
        password_salt=salt,
        role=role.value,
        is_verified=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    _issue_code(db, email)
    return new_user


def _issue_code(db: Session, email: str) -> None:
    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash, salt = _hash_password(code)
    db.add(
        VerificationCodeDB(
            email=email,
            code_hash=f"{salt}${code_hash}",
            expires_at=datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES),
        )
    )
    db.commit()
    send_verification_code(email, code)


def resend_code(db: Session, email: str) -> None:
    email = email.strip().lower()
    user = db.get(UserDB, email)
    if user is None:
        raise HTTPException(status_code=404, detail="No account with this email")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="This account is already verified — log in instead")
    _issue_code(db, email)


def verify_code(db: Session, email: str, code: str) -> str:
    email = email.strip().lower()
    user = db.get(UserDB, email)
    if user is None:
        raise HTTPException(status_code=404, detail="No account with this email")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="This account is already verified — log in instead")

    latest = (
        db.query(VerificationCodeDB)
        .filter(VerificationCodeDB.email == email)
        .order_by(VerificationCodeDB.created_at.desc())
        .first()
    )
    if latest is None or latest.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired — request a new one")

    salt, expected_hash = latest.code_hash.split("$", 1)
    if not secrets.compare_digest(_hash(code, salt), expected_hash):
        raise HTTPException(status_code=400, detail="Incorrect code")

    user.is_verified = True
    db.commit()

    return _create_session(db, email)

def _send_reset_email(user_email: str, token: str):
    # 1. Build the correct frontend URL
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    # 2. Format the email
    msg = EmailMessage()
    msg['Subject'] = "Reset Your Password"
    msg['From'] = "gitlabproject000@gmail.com"
    msg['To'] = user_email
    msg.set_content(f"Please click this link to reset your password:\n\n{reset_link}")
    
    # 3. Send the email
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls() # Secure the connection
            server.login("gitlabproject000@gmail.com", "oorq vntu berq duqc")
            server.send_message(msg)
        print(f"SUCCESS: Reset email sent to {user_email}")
    except Exception as e:
        print(f"FAILED to send email: {e}")


def forgot_password(db: Session, email: str):
    email = email.strip().lower()

    user = db.get(UserDB, email)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No account with this email"
        )

    token = secrets.token_urlsafe(32)

    reset = PasswordResetDB(
        token=token,
        email=email,
        expires_at=datetime.utcnow() + timedelta(
            minutes=RESET_TOKEN_TTL_MINUTES
        ),
    )

    db.add(reset)
    db.commit()

    _send_reset_email(email, token)
    return {
        "message": "Password reset link generated"
    }

def reset_password(
    db: Session,
    token: str,
    password: str,
):
    reset = db.get(PasswordResetDB, token)

    if reset is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    if reset.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Reset token expired"
        )

    user = db.get(UserDB, reset.email)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    password_hash, salt = _hash_password(password)

    user.password_hash = password_hash
    user.password_salt = salt

    db.delete(reset)

    db.commit()

    return {
        "message": "Password reset successful"
    }


def _create_session(db: Session, email: str) -> str:
    session = SessionTokenDB(token=secrets.token_urlsafe(32), email=email)
    db.add(session)
    db.commit()

    print("TOKEN SAVED:", session.token)

    return session.token


def login(db: Session, email: str, password: str) -> str:
    email = email.strip().lower()
    user = db.get(UserDB, email)

    # NEW: distinguish "no account with this email" from "wrong password",
    # so the frontend can show a "create an account" prompt specifically
    # for the missing-account case.
    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email. Please sign up first.",
        )

    if not _verify_password(password, user.password_salt, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email first — check your inbox for the code, "
            "or request a new one.",
        )

    return _create_session(db, email)


def logout(db: Session, token: str) -> None:
    session = db.get(SessionTokenDB, token)
    if session is not None:
        db.delete(session)
        db.commit()


def get_current_user(
    authorization: str = Header(..., description="Bearer <session token> from /api/auth/login"),
    db: Session = Depends(get_db),
) -> CurrentUser:

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header"
        )

    token = authorization.removeprefix("Bearer ").strip()

    # 👇 ADD THESE PRINTS
    print("====================================")
    print("TOKEN RECEIVED:", token)

    session = db.get(SessionTokenDB, token)

    print("SESSION FOUND:", session)
    print("====================================")

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid — please log in again"
        )

    user = db.get(UserDB, session.email)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Account no longer exists"
        )

    return CurrentUser(
        name=user.email,
        role=Role(user.role),
    )


def require_role(*allowed_roles: Role):
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role '{user.role.value}' is not permitted to perform this action. "
                f"Allowed roles: {', '.join(r.value for r in allowed_roles)}",
            )
        return user

    return _checker