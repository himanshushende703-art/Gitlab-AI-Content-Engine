# Workflow States

A content job moves through these statuses over its lifecycle:

| Status | Meaning | Set by |
|---|---|---|
| `intake` | Job created, AI workflow not yet run | `POST /api/content-jobs` |
| `drafting` | Agent workflow is currently running | `POST /api/agent-workflow/run` (start) |
| `ready_for_human_review` | Draft complete, waiting for a human | `POST /api/agent-workflow/run` (success) |
| `approved` | A reviewer accepted the draft | `POST /api/drafts/{id}/review` (action=accept) |
| `failed` | Either the AI workflow errored, or a reviewer rejected it | agent workflow error, or review action=reject |
| `published` | Final export has been produced | `POST /api/publish/export` |

## State diagram

```
intake ──▶ drafting ──▶ ready_for_human_review ──▶ approved ──▶ published
              │                    │
              ▼                    ▼
            failed              failed  (on reject)
                                   │
                                   ▼
                              drafting  (on request_revision)
```

## Notes

- `request_revision` sends the job back to `drafting` — call
  `POST /api/agent-workflow/run` again (or `/refine`) to produce a new
  version. Every run is saved as a new row in `draft_versions`, so
  nothing is lost.
- `published` is currently a terminal state in this MVP. A future
  improvement would allow re-opening a published job for corrections.
