# Architecture

## Overview

The system is organized around a **content job lifecycle**. A user submits
raw technical input, the system retrieves relevant knowledge, a 5-agent
CrewAI workflow drafts and refines the content, and a human reviewer
approves or rejects it before it's published.

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Frontend   │────▶│   FastAPI     │────▶│   PostgreSQL          │
│  (Next.js)   │◀────│   Backend     │◀────│   (Supabase)          │
└──────────────┘     └──────┬───────┘     └─────────────────────┘
                             │
                 ┌───────────┴────────────┐
                 ▼                        ▼
        ┌─────────────────┐     ┌──────────────────┐
        │  Chroma          │     │  CrewAI 5-Agent   │
        │  (retrieval /    │────▶│  Workflow          │
        │  knowledge base) │     │  (via Gemini API)  │
        └─────────────────┘     └──────────────────┘
```

## Request flow (happy path)

1. User fills the intake form (content type, audience, source text) → frontend sends `POST /api/content-jobs`
2. Backend validates input, creates a row in `content_jobs` (status: `intake`), logs the event
3. Frontend calls `POST /api/agent-workflow/run?job_id=...`
4. Backend queries Chroma for relevant style guides/docs/templates related to the source text
5. CrewAI runs 5 agents in sequence, each receiving the previous agent's output as context:
   - Context Reader → Documentation Writer → Technical Reviewer → Tone Optimizer → Publishing Coordinator
6. The final agent returns structured JSON (title, sections, source_references, assumptions, risk_flags)
7. Backend saves the result to `content_jobs` and a new row in `draft_versions`, updates status to `ready_for_human_review`
8. Human reviewer sees the draft + risk flags + assumptions, clicks Accept/Reject/Request Revision → `POST /api/drafts/{id}/review`
9. Once `approved`, `POST /api/publish/export` produces the final Markdown and marks status `published`

## Why 5 separate agents instead of one prompt

Each agent has a narrow, well-defined responsibility. This makes failures
diagnosable (you can see exactly which stage produced a problem), keeps
each prompt small and testable, and lets stages be re-run independently
in the future without regenerating the whole draft from scratch.

## Data layer

- **PostgreSQL (Supabase)** — operational data: jobs, draft versions, review actions
- **Chroma (local, file-based)** — vector search over style guides, sample docs, and content templates in `/data`

## Access control

Role-based access is enforced via `X-User-Name` / `X-User-Role` headers,
checked in `backend/auth/roles.py`. Four roles: `writer`,
`technical_reviewer`, `doc_lead`, `admin`. See that file for exactly
which roles can call which endpoints, and for notes on upgrading to a
real login system later.

## Observability

Every major event (job created, workflow started/completed/failed,
review action, export) is logged as a JSON line to `backend/audit.log`
via `backend/database/audit_log.py`.
