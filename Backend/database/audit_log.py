"""
database/audit_log.py
-----------------------
Implements the "observability / audit log" requirement from the PRD
(section 5.4 / 6.2: "Every content job, model call, prompt version,
review action, and export event should be logged").

For an MVP, we log structured JSON lines to a local file
(backend/audit.log). This is enough to demonstrate observability in a
demo and is easy to grep/inspect. In a production deployment, this
function is the one place you'd change to send logs to a real service
(e.g. Supabase table, Datadog, CloudWatch) instead of a file.
"""

import json
import os
from datetime import datetime

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "audit.log")


def log_event(event_type: str, job_id: str | None = None, **details) -> None:
    """
    event_type examples: "job_created", "agent_workflow_started",
    "agent_workflow_completed", "agent_workflow_failed", "review_action",
    "content_exported"
    """
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "job_id": job_id,
        **details,
    }
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def read_logs(limit: int = 200) -> list[dict]:
    """
    Reads audit.log back for the admin "Logs" screen (GET /api/admin/logs).
    Returns the most recent `limit` entries, newest first. Any malformed
    line (shouldn't happen, but a demo file can get hand-edited) is
    skipped instead of blowing up the whole endpoint.
    """
    if not os.path.exists(LOG_PATH):
        return []

    entries: list[dict] = []
    with open(LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    entries.reverse()  # newest first
    if limit:
        entries = entries[:limit]
    return entries
