"""
models.py
---------
Pydantic "shapes" for API requests and responses. This file used to also
contain an in-memory dictionary store — that has been replaced by a real
PostgreSQL database (see database/db.py, database/models_db.py,
database/crud.py). This file now only defines the data shapes.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ContentType(str, Enum):
    release_notes = "release_notes"
    documentation = "documentation"
    blog = "blog"
    api_reference = "api_reference"
    onboarding_guide = "onboarding_guide"


class JobStatus(str, Enum):
    intake = "intake"
    context_preparation = "context_preparation"
    drafting = "drafting"
    technical_review = "technical_review"
    tone_optimization = "tone_optimization"
    ready_for_human_review = "ready_for_human_review"
    doc_lead_review = "doc_lead_review"
    approved = "approved"
    published = "published"
    failed = "failed"


class SignupRequest(BaseModel):
    email: str = Field(..., examples=["you@example.com"])
    password: str = Field(..., min_length=6)
    role: str = Field("writer", examples=["writer", "technical_reviewer", "doc_lead", "admin"])


class VerifyCodeRequest(BaseModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str
    role: str


class SignupResponse(BaseModel):
    message: str
    email: str


class ContentJobUpdateRequest(BaseModel):
    """Direct manual edit of a draft's title/content (not an AI re-run)."""

    draft_title: Optional[str] = None
    draft_content: Optional[str] = None


class ContentJobCreateRequest(BaseModel):
    content_type: ContentType
    audience: str = Field(..., examples=["developers", "internal team", "customers"])
    title_hint: Optional[str] = Field(None, description="Optional working title")
    source_text: str = Field(
        ...,
        description="Raw input: code diff, release notes, product brief, etc.",
        min_length=10,
    )
    target_channel: Optional[str] = Field(None, examples=["blog", "docs site", "changelog"])
    gitlab_project_id: Optional[int] = None


class ReviewActionRequest(BaseModel):
    action: str = Field(..., examples=["accept", "reject", "request_revision"])
    comment: Optional[str] = None
    reviewer_name: str


class ContentJobResponse(BaseModel):
    """Response shape returned to the frontend for a content job."""
    model_config = ConfigDict(from_attributes=True)  # lets this read straight from the DB model

    job_id: str
    owner_email: Optional[str] = None
    content_type: str
    audience: str
    title_hint: Optional[str] = None
    source_text: str
    target_channel: Optional[str] = None

    status: str
    created_at: datetime
    updated_at: datetime

    context_summary: Optional[str] = None
    draft_title: Optional[str] = None
    draft_content: Optional[str] = None
    source_references: list = []
    assumptions: list = []
    risk_flags: list = []
    error: Optional[str] = None


class DraftVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: str
    version_number: int
    draft_title: Optional[str] = None
    draft_content: Optional[str] = None
    source_references: list = []
    assumptions: list = []
    risk_flags: list = []
    created_at: datetime


class ReviewActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: str
    reviewer_name: str
    action: str
    comment: Optional[str] = None
    created_at: datetime
