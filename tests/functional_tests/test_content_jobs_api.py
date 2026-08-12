"""
tests/functional_tests/test_content_jobs_api.py
---------------------------------------------------
Basic functional tests for the content job API endpoints.

HOW TO RUN:
    cd backend
    pip install pytest httpx --break-system-packages   (if not already installed)
    pytest ../tests/functional_tests -v

NOTE: These tests need a real DATABASE_URL configured in backend/.env
(pointing at your Supabase project) since they exercise the real
database layer, matching how the app actually runs.
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from main import app  # noqa: E402

client = TestClient(app)

WRITER_HEADERS = {"X-User-Name": "Test Writer", "X-User-Role": "writer"}
REVIEWER_HEADERS = {"X-User-Name": "Test Reviewer", "X-User-Role": "technical_reviewer"}


def test_health_check():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_content_job_requires_auth_headers():
    res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "release_notes",
            "audience": "developers",
            "source_text": "We added a dry-run flag to the CLI tool.",
        },
    )
    # No X-User-Name/X-User-Role headers -> should be rejected
    assert res.status_code in (401, 422)


def test_create_content_job_succeeds_with_writer_role():
    res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "release_notes",
            "audience": "developers",
            "source_text": "We added a dry-run flag to the CLI tool for local debugging.",
        },
        headers=WRITER_HEADERS,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "intake"
    assert "job_id" in body


def test_reviewer_cannot_create_content_job():
    res = client.post(
        "/api/content-jobs",
        json={
            "content_type": "blog",
            "audience": "developers",
            "source_text": "Some source text that is long enough to pass validation.",
        },
        headers=REVIEWER_HEADERS,
    )
    # technical_reviewer role is not allowed to create jobs
    assert res.status_code == 403


def test_get_nonexistent_job_returns_404():
    res = client.get("/api/content-jobs/does-not-exist")
    assert res.status_code == 404


def test_list_jobs_returns_array():
    res = client.get("/api/content-jobs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
