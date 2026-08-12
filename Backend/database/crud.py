"""
database/crud.py
-----------------
CRUD = Create, Read, Update, Delete. This file contains every function
that actually talks to the database. main.py calls these functions
instead of touching SQLAlchemy directly — this keeps main.py clean and
makes the database swappable later if needed.

This replaces the old in-memory dictionary from the first version of
models.py. The function names are kept the same on purpose so the rest
of the app barely had to change.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from database.models_db import ContentJobDB, DraftVersionDB, ReviewActionDB, UserDB


def create_job(db: Session, payload, owner_email: str | None = None) -> ContentJobDB:
    job = ContentJobDB(
        owner_email=owner_email,
        content_type=payload.content_type.value,
        audience=payload.audience,
        title_hint=payload.title_hint,
        source_text=payload.source_text,
        target_channel=payload.target_channel,
        gitlab_project_id=payload.gitlab_project_id,
        status="intake",
    )
    db.add(job)
    db.commit()
    db.refresh(job)  # loads the auto-generated job_id back into the object
    return job


def get_job(db: Session, job_id: str) -> ContentJobDB | None:
    return db.query(ContentJobDB).filter(ContentJobDB.job_id == job_id).first()


def list_jobs(db: Session) -> list[ContentJobDB]:
    return db.query(ContentJobDB).order_by(ContentJobDB.created_at.desc()).all()


def delete_job(db: Session, job_id: str) -> bool:
    job = get_job(db, job_id)
    if job is None:
        return False
    db.delete(job)  # cascades to versions + reviews
    db.commit()
    return True


def update_job(db: Session, job_id: str, **fields) -> ContentJobDB | None:
    job = get_job(db, job_id)
    if job is None:
        return None
    for key, value in fields.items():
        setattr(job, key, value)
    job.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(job)
    return job


def save_draft_version(db: Session, job_id: str, result: dict) -> DraftVersionDB:
    """
    Called every time the agent workflow finishes. Saves a permanent
    snapshot so you get real version history (PRD requirement 5.4).
    """
    existing_count = (
        db.query(DraftVersionDB).filter(DraftVersionDB.job_id == job_id).count()
    )
    version = DraftVersionDB(
        job_id=job_id,
        version_number=existing_count + 1,
        draft_title=result.get("draft_title"),
        draft_content=result.get("draft_content"),
        source_references=result.get("source_references", []),
        assumptions=result.get("assumptions", []),
        risk_flags=result.get("risk_flags", []),
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def list_draft_versions(db: Session, job_id: str) -> list[DraftVersionDB]:
    return (
        db.query(DraftVersionDB)
        .filter(DraftVersionDB.job_id == job_id)
        .order_by(DraftVersionDB.version_number.asc())
        .all()
    )


def add_review_action(
    db: Session, job_id: str, reviewer_name: str, action: str, comment: str | None
) -> ReviewActionDB:
    review = ReviewActionDB(
        job_id=job_id, reviewer_name=reviewer_name, action=action, comment=comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def list_review_actions(db: Session, job_id: str) -> list[ReviewActionDB]:
    return (
        db.query(ReviewActionDB)
        .filter(ReviewActionDB.job_id == job_id)
        .order_by(ReviewActionDB.created_at.asc())
        .all()
    )


# ---------------------------------------------------------------------------
# Users (Admin panel: "Manage Users" / user directory)
# ---------------------------------------------------------------------------

def list_users(db: Session) -> list[UserDB]:
    """All registered accounts, newest first. Used by GET /api/admin/users —
    admin-only, so this is safe to expose (accounts.py never returns the
    password hash/salt to the API layer, only this ORM object; main.py's
    response model strips those fields before they reach the client)."""
    return db.query(UserDB).order_by(UserDB.created_at.desc()).all()
