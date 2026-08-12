"""
tests/ai_output_tests/test_workflow_output_structure.py
------------------------------------------------------------
Tests that check the SHAPE and safety of the AI workflow's output,
without needing a live Gemini API key for every check (some tests here
mock the LLM call; one integration test is marked to skip by default
since it costs real API quota).

HOW TO RUN:
    cd backend
    pytest ../tests/ai_output_tests -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from agents.crew import _sections_to_markdown  # noqa: E402


def test_sections_to_markdown_formats_headings():
    sections = [
        {"heading": "Summary", "body": "This is the summary."},
        {"heading": "Details", "body": "These are the details."},
    ]
    result = _sections_to_markdown(sections)
    assert "## Summary" in result
    assert "## Details" in result
    assert "This is the summary." in result


def test_sections_to_markdown_handles_empty_list():
    result = _sections_to_markdown([])
    assert result == ""


def test_sections_to_markdown_handles_missing_heading():
    sections = [{"heading": "", "body": "Body text with no heading."}]
    result = _sections_to_markdown(sections)
    assert "Body text with no heading." in result
    assert "##" not in result


@pytest.mark.skip(
    reason="Costs real Gemini API quota — run manually with GEMINI_API_KEY set "
    "when you want to verify the full live pipeline output structure."
)
def test_full_workflow_returns_required_keys():
    from agents.crew import run_content_workflow

    result = run_content_workflow(
        content_type="release_notes",
        audience="developers",
        target_channel="changelog",
        source_text="Added a --dry-run flag to gitlab-runner exec.",
        title_hint="Dry Run Flag",
    )
    required_keys = {
        "context_summary",
        "draft_title",
        "draft_content",
        "source_references",
        "assumptions",
        "risk_flags",
    }
    assert required_keys.issubset(result.keys())
