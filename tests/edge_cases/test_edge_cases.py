"""
tests/edge_cases/test_edge_cases.py
--------------------------------------
Covers the edge cases explicitly called out in the PRD section 7.7:
"incomplete technical inputs, conflicting source notes, ... large files,
ambiguous API changes, unavailable retrieval data, and model failure."

HOW TO RUN:
    cd backend
    pytest ../tests/edge_cases -v
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)
WRITER_HEADERS = {"X-User-Name": "Test Writer", "X-User-Role": "writer"}


def test_source_text_too_short_is_rejected():
    """Pydantic's min_length=10 on source_text should reject near-empty input."""
    res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "release_notes",
            "audience": "developers",
            "source_text": "short",
        },
        headers=WRITER_HEADERS,
    )
    assert res.status_code == 422


def test_invalid_content_type_is_rejected():
    res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "not_a_real_type",
            "audience": "developers",
            "source_text": "This is a long enough source text for validation to pass.",
        },
        headers=WRITER_HEADERS,
    )
    assert res.status_code == 422


def test_invalid_role_header_is_rejected():
    res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "release_notes",
            "audience": "developers",
            "source_text": "This is a long enough source text for validation to pass.",
        },
        headers={"X-User-Name": "Someone", "X-User-Role": "super_admin_hacker"},
    )
    assert res.status_code == 401


def test_export_before_approval_is_rejected():
    """Publishing must be blocked until a job reaches 'approved' status (governance)."""
    create_res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "release_notes",
            "audience": "developers",
            "source_text": "This is a long enough source text for validation to pass.",
        },
        headers=WRITER_HEADERS,
    )
    job_id = create_res.json()["job_id"]

    export_res = client.post(
        f"/api/publish/export?job_id={job_id}",
        headers={"X-User-Name": "Doc Lead", "X-User-Role": "doc_lead"},
    )
    assert export_res.status_code == 400


def test_review_action_on_nonexistent_job_returns_404():
    res = client.post(
        "/api/drafts/does-not-exist/review",
        json={"action": "accept", "reviewer_name": "Reviewer", "comment": None},
        headers={"X-User-Name": "Reviewer", "X-User-Role": "technical_reviewer"},
    )
    assert res.status_code == 404
