"""
database/models_db.py
----------------------
This file defines the actual DATABASE TABLES (using SQLAlchemy ORM).

Don't confuse this with backend/models.py — that file defines the
Pydantic "shapes" the API uses for requests/responses. This file defines
what gets permanently stored in PostgreSQL.

Three tables:
    1. content_jobs     -> one row per content request (the main record)
    2. draft_versions   -> every time the agent workflow runs, we save a
                            snapshot here, so you get real version history
    3. review_actions   -> every accept/reject/revision-request a human
                            makes, so you get a full audit trail
"""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database.db import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class ContentJobDB(Base):
    __tablename__ = "content_jobs"

    job_id = Column(String, primary_key=True, default=_new_uuid)

    # Which account created this job. Used to restrict edit/delete so a
    # user can only manage their own docs (reviewers can still see/review
    # everyone's jobs, but can't edit or delete jobs they don't own).
    owner_email = Column(String, ForeignKey("users.email"), nullable=True)

    content_type = Column(String, nullable=False)
    audience = Column(String, nullable=False)
    title_hint = Column(String, nullable=True)
    source_text = Column(Text, nullable=False)
    target_channel = Column(String, nullable=True)
    gitlab_project_id = Column(Integer, nullable=True)

    status = Column(String, nullable=False, default="intake")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    context_summary = Column(Text, nullable=True)
    draft_title = Column(String, nullable=True)
    draft_content = Column(Text, nullable=True)

    # JSON columns store Python lists directly — no extra tables needed
    source_references = Column(JSON, default=list)
    assumptions = Column(JSON, default=list)
    risk_flags = Column(JSON, default=list)

    error = Column(Text, nullable=True)

    versions = relationship(
        "DraftVersionDB", back_populates="job", cascade="all, delete-orphan"
    )
    reviews = relationship(
        "ReviewActionDB", back_populates="job", cascade="all, delete-orphan"
    )


class UserDB(Base):
    """
    A registered account, identified by email (must be unique). Passwords
    are stored as a salted PBKDF2 hash (see auth/accounts.py) — never in
    plain text. `is_verified` stays False until the person enters the
    6-digit code emailed to them at signup.
    """

    __tablename__ = "users"

    email = Column(String, primary_key=True)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)
    role = Column(String, nullable=False, default="writer")
    is_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class VerificationCodeDB(Base):
    """
    A one-time 6-digit code emailed to a user to confirm they own the
    address they signed up with. Stored hashed, like a password, with an
    expiry so old codes can't be reused. See auth/email_utils.py for how
    the code is actually delivered.
    """

    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, ForeignKey("users.email"), nullable=False)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
class PasswordResetDB(Base):
    __tablename__ = "password_reset_tokens"

    token = Column(String, primary_key=True)
    email = Column(String, ForeignKey("users.email"), nullable=False)

    expires_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)


class SessionTokenDB(Base):
    """
    A logged-in session. The frontend stores this token (in localStorage)
    after verifying/login and sends it back as `Authorization: Bearer
    <token>` on every request, so a user stays logged in across page
    refreshes.
    """

    __tablename__ = "session_tokens"

    token = Column(String, primary_key=True, default=_new_uuid)
    email = Column(String, ForeignKey("users.email"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DraftVersionDB(Base):
    __tablename__ = "draft_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("content_jobs.job_id"), nullable=False)

    version_number = Column(Integer, nullable=False)
    draft_title = Column(String, nullable=True)
    draft_content = Column(Text, nullable=True)
    source_references = Column(JSON, default=list)
    assumptions = Column(JSON, default=list)
    risk_flags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ContentJobDB", back_populates="versions")


class ReviewActionDB(Base):
    __tablename__ = "review_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String, ForeignKey("content_jobs.job_id"), nullable=False)

    reviewer_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("ContentJobDB", back_populates="reviews")
