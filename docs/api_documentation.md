# API Documentation

Base URL (local dev): `http://127.0.0.1:8000`

All endpoints except `GET /`, `GET /api/content-jobs`, and `GET /api/content-jobs/{id}`
require these headers for role-based access:

```
X-User-Name: <display name>
X-User-Role: writer | technical_reviewer | doc_lead | admin
```

## Content Jobs

### `POST /api/content-jobs`
Creates a new content job. **Roles allowed:** `writer`, `admin`

Body:
```json
{
  "content_type": "release_notes",
  "audience": "developers",
  "title_hint": "Dry Run Flag",
  "source_text": "Added a --dry-run flag to gitlab-runner exec...",
  "target_channel": "changelog"
}
```

### `GET /api/content-jobs`
Lists all jobs, newest first. No role restriction (read-only).

### `GET /api/content-jobs/{job_id}`
Gets one job's full current state.

### `GET /api/content-jobs/{job_id}/versions`
Returns every saved draft version for a job (full version history).

### `GET /api/content-jobs/{job_id}/reviews`
Returns every reviewer action taken on a job (audit trail).

## Context / Retrieval

### `POST /api/context-pack?job_id=...`
Previews what knowledge base entries (style guides, sample docs,
templates) would be retrieved for this job, without running the full
(slower) agent workflow.

## Agent Workflow

### `POST /api/agent-workflow/run?job_id=...`
Runs the full 5-agent CrewAI pipeline. **Roles allowed:** `writer`, `admin`.
Takes 10-40 seconds. Updates job status to `ready_for_human_review` on
success, `failed` on error.

### `POST /api/drafts/{job_id}/refine?job_id=...`
Re-runs the workflow to produce a new version. **Roles allowed:** `writer`, `admin`.

## Review

### `POST /api/drafts/{job_id}/review`
Records a human review decision. **Roles allowed:** `technical_reviewer`, `doc_lead`, `admin`.

Body:
```json
{ "action": "accept", "reviewer_name": "Priya", "comment": "Looks good" }
```
`action` is one of: `accept`, `reject`, `request_revision`.

## Publishing

### `POST /api/publish/export?job_id=...`
Exports an `approved` job as Markdown and marks it `published`.
**Roles allowed:** `doc_lead`, `admin`. Returns `400` if the job isn't approved yet.

## Metrics

### `GET /api/metrics`
Returns job counts grouped by status, for the operations dashboard.
