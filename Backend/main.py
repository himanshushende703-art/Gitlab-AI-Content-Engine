"""
main.py
-------
FastAPI backend. This version connects to a real PostgreSQL (Supabase)
database instead of an in-memory dictionary, uses Chroma retrieval for
source grounding, enforces simple role-based access, and logs every
major event to an audit log.

HOW TO RUN THIS FILE:
    1. cd backend
    2. python -m venv venv
    3. source venv/bin/activate           (Windows: venv\\Scripts\\activate)
    4. pip install -r requirements.txt
    5. cp .env.example .env               (paste your Gemini key + Supabase DATABASE_URL)
    6. python -m retrieval.ingest_knowledge     (loads the knowledge base into Chroma)
    7. uvicorn main:app --reload

Then open http://127.0.0.1:8000/docs
"""
import os  # UPDATED: FRONTEND_ORIGINS env var padhne ke liye zaroori

from services.gitlab_service import GitLabService
from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# NOTE: `agents.crew` (CrewAI) is imported lazily, inside
# run_agent_workflow() below, instead of here at module level.
# CrewAI + crewai-tools pull in a very large dependency tree (LangChain,
# etc.), and importing it at startup means every single instance —
# even one just checking login/job-status — pays that memory cost.
# On Render's free tier (512MB), that was pushing memory usage high
# enough to trigger repeated "Instance failed" OOM restarts (visible in
# the Events timeline). Loading it only when the workflow actually runs
# keeps idle memory much lower.
from auth import accounts
from auth.accounts import get_current_user, require_role
from auth.roles import CurrentUser, Role
from database import crud
from database.audit_log import log_event, read_logs
from database.db import get_db, init_db
from retrieval.chroma_store import query_relevant
from services.repository_reader import RepositoryReader
from services.context_builder import ContextBuilder
from pprint import pprint
from models import (
    AdminLogEntry,
    AdminUserResponse,
    AuthResponse,
    ContentJobCreateRequest,
    ContentJobResponse,
    ContentJobUpdateRequest,
    DraftVersionResponse,
    LoginRequest,
    ResendCodeRequest,
    ReviewActionRequest,
    ReviewActionResponse,
    SignupRequest,
    SignupResponse,
    VerifyCodeRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)


def _require_owner_or_admin(job, user: CurrentUser) -> None:
    """A user may only edit/delete jobs they created (admins can always)."""
    if user.role == Role.admin:
        return
    if job.owner_email != user.name:
        raise HTTPException(
            status_code=403,
            detail="You can only edit or delete docs you created.",
        )
app = FastAPI(
    title="GitLab AI Content & Documentation Engine",
    description="Multi-agent system that turns technical inputs into review-ready content.",
    version="0.2.0",
)
gitlab_service = GitLabService()
repository_reader = RepositoryReader()
context_builder = ContextBuilder()
# --- UPDATED FOR DEPLOYMENT ---
# Pehle yahan sirf localhost hardcoded tha, jisse deployed frontend
# (Vercel URL) se aane wali requests CORS error de rahi thi.
# Ab FRONTEND_ORIGINS env var se control hota hai, comma-separated URLs.
# Local development ke liye default localhost hi rahega agar env var set na ho.
frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Creates tables in your Supabase database if they don't exist yet.
    init_db()

    # UPDATED FOR DEPLOYMENT (Render free tier):
    # Render's free tier uses an ephemeral disk — anything written to
    # local disk (like backend/chroma_data/) is wiped every time the
    # service restarts or redeploys. Without this, the Chroma knowledge
    # base would stay empty after every deploy, causing "No Source
    # Material Found" / "0 Sources" in the Context Preview screen even
    # though the data/ folder itself is fine.
    # Running the ingest here means the knowledge base is rebuilt from
    # the data/ folder automatically on every startup, so it's always
    # populated without needing a paid persistent disk.
    try:
        from retrieval.ingest_knowledge import ingest_all
        count = ingest_all()
        print(f"[STARTUP] Knowledge base ingested: {count} chunks loaded.")
    except Exception as exc:
        # Don't let a knowledge-base hiccup prevent the whole app from
        # starting — the workflow still runs fine without it, just
        # without the extra style-guide/sample-doc grounding.
        print(f"[STARTUP] Knowledge base ingest failed: {exc}")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "gitlab-ai-content-engine"}


# ---------------------------------------------------------------------------
# Auth: signup / verify / login / who-am-i
# ---------------------------------------------------------------------------

@app.post("/api/auth/signup", response_model=SignupResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Creates a real, persisted (but unverified) account and emails a
    6-digit verification code. No session token yet — call
    /api/auth/verify with the code to finish signing up and log in.
    """
    try:
        role = Role(payload.role)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(r.value for r in Role)}",
        )
    user = accounts.signup(db, payload.email, payload.password, role)
    log_event("account_created", created_by=user.email, role=user.role)
    return SignupResponse(message="Verification code sent to your email", email=user.email)


@app.post("/api/auth/verify", response_model=AuthResponse)
def verify(payload: VerifyCodeRequest, db: Session = Depends(get_db)):
    """Confirms the emailed code and logs the now-verified account in."""
    token = accounts.verify_code(db, payload.email, payload.code)
    user = db.get(accounts.UserDB, payload.email.strip().lower())
    log_event("account_verified", created_by=user.email)
    return AuthResponse(token=token, email=user.email, role=user.role)


@app.post("/api/auth/resend-code")
def resend_code(payload: ResendCodeRequest, db: Session = Depends(get_db)):
    accounts.resend_code(db, payload.email)
    return {"ok": True}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Logs an existing, verified account in and returns a session token."""
    token = accounts.login(db, payload.email, payload.password)
    user = db.get(accounts.UserDB, payload.email.strip().lower())
    log_event("login", created_by=user.email)
    return AuthResponse(token=token, email=user.email, role=user.role)


@app.post("/api/auth/logout")
def logout(authorization: str = Header(...), db: Session = Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    accounts.logout(db, token)
    return {"ok": True}
    
@app.post("/api/auth/forgot-password")
def forgot_password_api(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    return accounts.forgot_password(
        db,
        request.email,
    )

@app.post("/api/auth/reset-password")
def reset_password_api(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    return accounts.reset_password(
        db,
        request.token,
        request.password,
    )


@app.get("/api/auth/me", response_model=AuthResponse)
def whoami(user: CurrentUser = Depends(get_current_user)):
    return AuthResponse(token="", email=user.name, role=user.role.value)


# ---------------------------------------------------------------------------
# Content jobs
# ---------------------------------------------------------------------------

@app.post("/api/content-jobs", response_model=ContentJobResponse)
def create_content_job(
    payload: ContentJobCreateRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(Role.writer, Role.admin)),
):
    """Step 1: create a job from raw user input. Does NOT run the AI yet."""
    job = crud.create_job(db, payload, owner_email=user.name)
    log_event("job_created", job_id=job.job_id, created_by=user.name, content_type=job.content_type)
    return job


@app.get("/api/content-jobs", response_model=list[ContentJobResponse])
def get_all_jobs(db: Session = Depends(get_db)):
    """List all jobs, newest first — powers the publishing dashboard.
    Everyone can see everyone's jobs (reviewers need this); edit/delete
    is still restricted to the owner (see below)."""

    jobs = crud.list_jobs(db)

    # NEW: mark jobs that a Technical Reviewer / Doc Lead sent back with
    # "request_revision". Those jobs land back in "drafting" status —
    # same as a brand-new draft — so without this flag the writer
    # dashboard can't tell the two apart.
    enriched = []
    for job in jobs:
        item = ContentJobResponse.model_validate(job)
        reviews = crud.list_review_actions(db, job.job_id)
        last_status_review = next(
            (r for r in reversed(reviews) if r.action != "comment"),
            None,
        )
        item.revision_requested = (
            job.status == "drafting"
            and last_status_review is not None
            and last_status_review.action == "request_revision"
        )
        if item.revision_requested:
            item.latest_review_comment = last_status_review.comment
        enriched.append(item)

    return enriched


@app.get("/api/content-jobs/{job_id}", response_model=ContentJobResponse)
def get_content_job(job_id: str, db: Session = Depends(get_db)):
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.patch("/api/content-jobs/{job_id}", response_model=ContentJobResponse)
def edit_content_job(
    job_id: str,
    payload: ContentJobUpdateRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Manually edit a draft's title/content. Owner (or admin) only."""
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    _require_owner_or_admin(job, user)

    fields = payload.model_dump(exclude_unset=True)
    updated = crud.update_job(db, job_id, **fields)
    log_event("job_edited", job_id=job_id, edited_by=user.name)
    return updated


@app.delete("/api/content-jobs/{job_id}")
def delete_content_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Delete only the user's own unsubmitted draft."""
    job = crud.get_job(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    # Only the owner can delete their own draft.
    _require_owner_or_admin(job, user)

    # Submitted/processed jobs cannot be deleted.
    protected_statuses = {
        "ready_for_human_review",
        "doc_lead_review",
        "approved",
        "published",
    }

    if job.status in protected_statuses:
        raise HTTPException(
            status_code=403,
            detail="Submitted or processed drafts cannot be deleted.",
        )

    crud.delete_job(db, job_id)

    log_event(
        "job_deleted",
        job_id=job_id,
        deleted_by=user.name,
    )

    return {"ok": True}


@app.get("/api/content-jobs/{job_id}/versions", response_model=list[DraftVersionResponse])
def get_job_versions(job_id: str, db: Session = Depends(get_db)):
    """Returns full version history for a job's drafts (PRD: version records)."""
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return crud.list_draft_versions(db, job_id)


@app.get("/api/content-jobs/{job_id}/reviews", response_model=list[ReviewActionResponse])
def get_job_reviews(job_id: str, db: Session = Depends(get_db)):
    """Returns the full reviewer decision history for a job (audit trail)."""
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return crud.list_review_actions(db, job_id)


# ---------------------------------------------------------------------------
# Context preparation (preview retrieval before running the full workflow)
# ---------------------------------------------------------------------------

@app.post("/api/context-pack")
def build_context_pack(job_id: str, db: Session = Depends(get_db)):
    """
    Lets the frontend show the "Context Review" screen from the PRD:
    what knowledge base entries would be used for this job BEFORE
    committing to a full (slower, LLM-calling) agent workflow run.
    """
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    builder = ContextBuilder()

    context = builder.build_context(
      source_text=job.source_text,
      project_id=job.gitlab_project_id,
)
    pprint(context["repository"])
    return {
      "job_id": job_id,
      "retrieved_knowledge": context["knowledge"],
      "repository": context["repository"],
      "documents": context["documents"],
}


# ---------------------------------------------------------------------------
# Agent workflow
# ---------------------------------------------------------------------------

@app.post("/api/agent-workflow/run", response_model=ContentJobResponse)
def run_agent_workflow(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(Role.writer, Role.admin)),
):
    """
    Step 2: run the 5-agent CrewAI pipeline (with Chroma retrieval baked
    in) for a given job. May take 10-40 seconds.
    """
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    crud.update_job(db, job_id, status="drafting")
    log_event("agent_workflow_started", job_id=job_id, started_by=user.name)

    # Lazy import: only pulls in crewai/crewai-tools (heavy) at the
    # moment the workflow actually runs, not at app startup. See the
    # note next to the top-level imports for why this matters on
    # Render's free 512MB tier.
    from agents.crew import run_content_workflow

    try:
       
    # Build complete context package
        context = context_builder.build_context(
        source_text=job.source_text,
        project_id=job.gitlab_project_id,
        uploaded_documents=None,   # PDF integration will be added later
        )

    # Convert context package into one source-grounded input
        final_source = f"""
        SOURCE INPUT
        ============

        {context["source_text"]}

        ============================
        REPOSITORY CONTEXT
        ============================

        {context["repository_summary"] or "Not Provided"}

        ============================
        KNOWLEDGE BASE
        ============================

        {context["knowledge"]}
        """

        result = run_content_workflow(
    content_type=job.content_type,
    audience=job.audience,
    target_channel=job.target_channel or "general",
    source_text=final_source,
    title_hint=job.title_hint,
    repository_summary=context["repository_summary"],
)

    except Exception as exc:

       crud.update_job(db, job_id, status="failed", error=str(exc))
       log_event("agent_workflow_failed", job_id=job_id, error=str(exc))
       raise HTTPException(
       status_code=500,
       detail=f"Agent workflow failed: {exc}"
       ) from exc

    updated = crud.update_job(
        db,
        job_id,
        status="drafting",
        context_summary=result["context_summary"],
        draft_title=result["draft_title"],
        draft_content=result["draft_content"],
        source_references=result["source_references"],
        assumptions=result["assumptions"],
        risk_flags=result["risk_flags"],
    )
    crud.save_draft_version(db, job_id, result)
    log_event("agent_workflow_completed", job_id=job_id)
    return updated


@app.post("/api/drafts/{job_id}/refine")
def refine_draft(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(Role.writer, Role.admin)),
):
    """
    PRD requirement: "rerun selected refinement stages ... without
    restarting the full workflow." For this MVP, refine re-runs the full
    pipeline (still faster than starting a brand-new job) and saves a new
    version. Splitting this into stage-by-stage reruns is a good next
    improvement once the team has bandwidth.
    """
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    _require_owner_or_admin(job, user)
    return run_agent_workflow(job_id=job_id, db=db, user=user)

# ---------------------------------------------------------------------------
# Submit draft for technical review
# ---------------------------------------------------------------------------

@app.post("/api/drafts/{job_id}/submit-review", response_model=ContentJobResponse)
def submit_for_technical_review(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_role(Role.writer, Role.admin)
    ),
):
    """
    Writer submits a generated draft for Technical Reviewer review.
    """

    job = crud.get_job(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    # Only the owner or admin can submit the draft
    _require_owner_or_admin(job, user)

    # Draft must be ready to move into technical review
    allowed_statuses = {
        "drafting",
        "ready_for_human_review",
    }

    if job.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Draft cannot be submitted for technical review "
                f"from status '{job.status}'"
            ),
        )

    updated = crud.update_job(
        db,
        job_id,
        status="ready_for_human_review",
    )

    # NEW: snapshot a new version every time the writer sends a draft
    # (back) to review — this covers the first submission AND every
    # resubmission after a "request_revision", so version history grows
    # 1, 2, 3... each time, instead of only when the AI first generates it.
    crud.save_draft_version(
        db,
        job_id,
        {
            "draft_title": updated.draft_title,
            "draft_content": updated.draft_content,
            "source_references": updated.source_references,
            "assumptions": updated.assumptions,
            "risk_flags": updated.risk_flags,
        },
    )

    log_event(
        "draft_submitted_for_technical_review",
        job_id=job_id,
        submitted_by=user.name,
    )

    return updated


# ---------------------------------------------------------------------------
# Human review
# ---------------------------------------------------------------------------

@app.post("/api/drafts/{job_id}/review", response_model=ContentJobResponse)
def review_draft(
    job_id: str,
    payload: ReviewActionRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_role(
            Role.technical_reviewer,
            Role.doc_lead,
            Role.admin,
        )
    ),
):
    """
    Human review workflow.

    Technical Reviewer:
        ready_for_human_review -> doc_lead_review
        request_revision -> drafting
        reject -> failed

    Doc Lead:
        doc_lead_review -> approved
        request_revision -> drafting
        reject -> failed

    Admin:
        Can perform review actions as an override.

    Comment (any reviewer role, any status):
        Leaves a note on the draft without moving its status.
        Requires a non-empty `comment`.
    """

    job = crud.get_job(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job not found",
        )

    action = payload.action

    allowed_actions = {
        "accept",
        "request_revision",
        "reject",
        "comment",
    }

    if action not in allowed_actions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid review action. "
                "Allowed actions: accept, request_revision, reject, comment"
            ),
        )

    # ---------------------------------------------------------
    # Comment (leaves a note only — status is not changed,
    # allowed from any status the reviewer can currently see)
    # ---------------------------------------------------------

    if action == "comment":

        if not payload.comment or not payload.comment.strip():
            raise HTTPException(
                status_code=400,
                detail="Comment text is required.",
            )

        crud.add_review_action(
            db,
            job_id,
            reviewer_name=user.name,
            action=action,
            comment=payload.comment,
        )

        log_event(
            "review_comment_added",
            job_id=job_id,
            reviewer=user.name,
        )

        return job

    # ---------------------------------------------------------
    # Technical Reviewer
    # ---------------------------------------------------------

    if user.role == Role.technical_reviewer:

        if job.status != "ready_for_human_review":
            raise HTTPException(
                status_code=403,
                detail=(
                    "Technical Reviewer can review only jobs "
                    "in ready_for_human_review status."
                ),
            )

        if action == "accept":
            new_status = "doc_lead_review"

        elif action == "request_revision":
            new_status = "drafting"

        else:  # reject
            new_status = "failed"

    # ---------------------------------------------------------
    # Doc Lead
    # ---------------------------------------------------------

    elif user.role == Role.doc_lead:

        if job.status != "doc_lead_review":
            raise HTTPException(
                status_code=403,
                detail=(
                    "Doc Lead can review only jobs "
                    "in doc_lead_review status."
                ),
            )

        if action == "accept":
            new_status = "approved"

        elif action == "request_revision":
            new_status = "drafting"

        else:  # reject
            new_status = "failed"

    # ---------------------------------------------------------
    # Admin
    # ---------------------------------------------------------

    else:
        # Admin can review/override the workflow.

        if action == "accept":

            if job.status == "ready_for_human_review":
                new_status = "doc_lead_review"

            elif job.status == "doc_lead_review":
                new_status = "approved"

            else:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Admin cannot accept job from "
                        f"status '{job.status}'."
                    ),
                )

        elif action == "request_revision":
            new_status = "drafting"

        else:
            new_status = "failed"

    # ---------------------------------------------------------
    # Save review history
    # ---------------------------------------------------------

    crud.add_review_action(
        db,
        job_id,
        reviewer_name=user.name,
        action=action,
        comment=payload.comment,
    )

    updated = crud.update_job(
        db,
        job_id,
        status=new_status,
    )

    log_event(
        "review_action",
        job_id=job_id,
        reviewer=user.name,
        action=action,
        new_status=new_status,
    )

    return updated


# ---------------------------------------------------------------------------
# Publishing
# ---------------------------------------------------------------------------

@app.post("/api/publish/export")
def export_content(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_role(Role.admin)
    ),
):
    """Step 4: export the approved draft as Markdown."""
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Job must be 'approved' before export (current status: {job.status})",
        )

    markdown = f"# {job.draft_title}\n\n{job.draft_content}\n"
    crud.update_job(db, job_id, status="published")
    log_event("content_exported", job_id=job_id, exported_by=user.name)

    # NEW: visible confirmation in the backend terminal the moment Admin
    # publishes a document — makes the publish action easy to demo/verify
    # without having to open the DB or the audit log file.
    print(
        f"[PUBLISH] ✅ Document '{job.draft_title}' (job_id={job_id}) "
        f"published successfully by {user.name}"
    )

    return {"job_id": job_id, "filename": f"{job.job_id}.md", "markdown": markdown}


# ---------------------------------------------------------------------------
# Admin: audit logs + user directory
# ---------------------------------------------------------------------------

@app.get("/api/admin/logs", response_model=list[AdminLogEntry])
def get_admin_logs(
    limit: int = 200,
    user: CurrentUser = Depends(require_role(Role.admin)),
):
    """
    Admin-only. Returns the audit trail written by database/audit_log.py
    (backend/audit.log) — every signup, login, job created/edited,
    review action, and publish event — newest first.
    """
    return read_logs(limit=limit)


@app.get("/api/admin/users", response_model=list[AdminUserResponse])
def get_admin_users(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(Role.admin)),
):
    """
    Admin-only. Returns every registered account (email, role, verified
    status, signup date) so an admin can see/manage who has access.
    Never includes password_hash/password_salt.
    """
    return crud.list_users(db)


    return {"job_id": job_id, "filename": f"{job.job_id}.md", "markdown": markdown}


@app.get("/api/content-jobs/{job_id}/export")
def export_content_readonly(
    job_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(
        require_role(Role.admin)
    ),
):
    """
    NEW: Admin-only read-only export. Downloads the current Markdown for
    an approved or already-published doc WITHOUT changing its status —
    unlike POST /api/publish/export above, which both exports AND moves
    the doc from 'approved' to 'published'. This lets Admin re-download a
    doc any time after it's been published, or preview the Markdown for
    an approved doc before deciding to publish it.
    """
    job = crud.get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("approved", "published"):
        raise HTTPException(
            status_code=400,
            detail=(
                "Job must be 'approved' or 'published' to export "
                f"(current status: {job.status})"
            ),
        )

    markdown = f"# {job.draft_title}\n\n{job.draft_content}\n"
    log_event("content_export_downloaded", job_id=job_id, exported_by=user.name)

    return {"job_id": job_id, "filename": f"{job.job_id}.md", "markdown": markdown}


# ---------------------------------------------------------------------------
# Metrics (Publishing Operations Dashboard)
# ---------------------------------------------------------------------------

@app.get("/api/metrics")
def get_metrics(db: Session = Depends(get_db)):
    """Powers the operations dashboard: counts by status."""
    jobs = crud.list_jobs(db)
    counts: dict[str, int] = {}
    for j in jobs:
        counts[j.status] = counts.get(j.status, 0) + 1
    return {"total_jobs": len(jobs), "by_status": counts}


# ---------------------------------------------------------------------------
# Role-based Dashboard
# ---------------------------------------------------------------------------

@app.get("/api/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Role-based live dashboard.

    Dashboard data is calculated from the same jobs and review history
    stored in PostgreSQL/Supabase.
    """

    jobs = crud.list_jobs(db)

    role = user.role.value

    # ---------------------------------------------------------
    # Common helper
    # ---------------------------------------------------------

    def job_item(job):
        reviews = crud.list_review_actions(db, job.job_id)

        latest_review = None

        if reviews:
            latest_review = reviews[-1]

        return {
            "job_id": job.job_id,
            "title": (
                job.draft_title
                or job.title_hint
                or "Untitled Draft"
            ),
            "owner_email": job.owner_email,
            "content_type": job.content_type,
            "status": job.status,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "latest_review": (
                {
                    "action": latest_review.action,
                    "reviewer_name": latest_review.reviewer_name,
                    "comment": latest_review.comment,
                    "created_at": latest_review.created_at,
                }
                if latest_review
                else None
            ),
        }

    # ---------------------------------------------------------
    # WRITER DASHBOARD
    # ---------------------------------------------------------

    if user.role == Role.writer:

        my_jobs = [
            j for j in jobs
            if j.owner_email == user.name
        ]

        pending = [
            j for j in my_jobs
            if j.status == "ready_for_human_review"
        ]

        revision_required = [
            j for j in my_jobs
            if j.status == "drafting"
            and crud.list_review_actions(
                db, j.job_id
            )
        ]

        rejected = [
            j for j in my_jobs
            if j.status == "failed"
        ]

        published = [
            j for j in my_jobs
            if j.status == "published"
        ]

        return {
            "role": role,
            "user": user.name,

            "stats": {
                "my_drafts": len(my_jobs),
                "pending_review": len(pending),
                "revision_required": len(revision_required),
                "rejected": len(rejected),
                "published": len(published),
            },

            "sections": {
                "my_drafts": [
                    job_item(j) for j in my_jobs
                ],

                "pending_review": [
                    job_item(j) for j in pending
                ],

                "revision_required": [
                    job_item(j) for j in revision_required
                ],

                "rejected": [
                    job_item(j) for j in rejected
                ],

                "published": [
                    job_item(j) for j in published
                ],
            },
        }

    # ---------------------------------------------------------
    # TECHNICAL REVIEWER DASHBOARD
    # ---------------------------------------------------------

    if user.role == Role.technical_reviewer:

        pending = [
            j for j in jobs
            if j.status == "ready_for_human_review"
        ]

        approved = [
            j for j in jobs
            if j.status == "doc_lead_review"
            or j.status == "approved"
        ]

        rejected = [
            j for j in jobs
            if j.status == "failed"
        ]

        history = [
            j for j in jobs
            if crud.list_review_actions(
                db, j.job_id
            )
        ]

        return {
            "role": role,
            "user": user.name,

            "stats": {
                "pending_reviews": len(pending),
                "approved": len(approved),
                "rejected": len(rejected),
                "history": len(history),
            },

            "sections": {
                "pending_reviews": [
                    job_item(j) for j in pending
                ],

                "approved": [
                    job_item(j) for j in approved
                ],

                "rejected": [
                    job_item(j) for j in rejected
                ],

                "history": [
                    job_item(j) for j in history
                ],
            },
        }

    # ---------------------------------------------------------
    # DOC LEAD DASHBOARD
    # ---------------------------------------------------------

    if user.role == Role.doc_lead:

        pending = [
            j for j in jobs
            if j.status == "doc_lead_review"
        ]

        approved = [
            j for j in jobs
            if j.status == "approved"
        ]

        rejected = [
            j for j in jobs
            if j.status == "failed"
        ]

        history = [
            j for j in jobs
            if crud.list_review_actions(
                db, j.job_id
            )
        ]

        return {
            "role": role,
            "user": user.name,

            "stats": {
                "pending_reviews": len(pending),
                "approved": len(approved),
                "rejected": len(rejected),
                "history": len(history),
            },

            "sections": {
                "pending_reviews": [
                    job_item(j) for j in pending
                ],

                "approved": [
                    job_item(j) for j in approved
                ],

                "rejected": [
                    job_item(j) for j in rejected
                ],

                "history": [
                    job_item(j) for j in history
                ],
            },
        }

    # ---------------------------------------------------------
    # ADMIN DASHBOARD
    # ---------------------------------------------------------

    if user.role == Role.admin:

        counts = {}

        for j in jobs:
            counts[j.status] = (
                counts.get(j.status, 0) + 1
            )

        users = db.query(accounts.UserDB).all()

        role_counts = {
            "writer": 0,
            "technical_reviewer": 0,
            "doc_lead": 0,
            "admin": 0,
        }

        for account in users:
            if account.role in role_counts:
                role_counts[account.role] += 1

        return {
            "role": role,
            "user": user.name,

            "stats": {
                "total_jobs": len(jobs),
                "drafting": counts.get(
                    "drafting", 0
                ),
                "ready_for_human_review": counts.get(
                    "ready_for_human_review", 0
                ),
                "doc_lead_review": counts.get(
                    "doc_lead_review", 0
                ),
                "approved": counts.get(
                    "approved", 0
                ),
                "published": counts.get(
                    "published", 0
                ),
                "failed": counts.get(
                    "failed", 0
                ),
            },

            "users": {
                "total": len(users),
                "by_role": role_counts,
            },

            "jobs": [
                job_item(j) for j in jobs
            ],
        }

    raise HTTPException(
        status_code=403,
        detail="Unsupported dashboard role",
    )

@app.get("/api/workflow/inbox")
def get_workflow_inbox(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns documents relevant to the logged-in user's role.
    """

    jobs = crud.list_jobs(db)

    # ---------------------------------------------------------
    # WRITER
    # ---------------------------------------------------------
    if user.role == Role.writer:
        jobs = [
            job
            for job in jobs
            if job.owner_email == user.name
        ]

    # ---------------------------------------------------------
    # TECHNICAL REVIEWER
    # ---------------------------------------------------------
    elif user.role == Role.technical_reviewer:
        jobs = [
            job
            for job in jobs
            if job.status == "ready_for_human_review"
        ]

    # ---------------------------------------------------------
    # DOC LEAD
    # ---------------------------------------------------------
    elif user.role == Role.doc_lead:
        jobs = [
            job
            for job in jobs
            if job.status == "doc_lead_review"
        ]

    # ---------------------------------------------------------
    # ADMIN
    # ---------------------------------------------------------
    elif user.role == Role.admin:
        # Admin can see all workflow jobs
        pass

    return {
        "role": user.role.value,
        "total": len(jobs),
        "jobs": jobs,
    }

@app.get("/api/gitlab/projects")
def get_gitlab_projects(
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns all GitLab repositories accessible by the authenticated user.
    """
    return gitlab_service.get_projects()

@app.get("/api/gitlab/projects/{project_id}/tree")
def get_repository_tree(
    project_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns repository tree of selected GitLab project.
    """
    return gitlab_service.get_repository_tree(project_id)

@app.get("/api/gitlab/projects/{project_id}/file")
def get_gitlab_file(
    project_id: int,
    file_path: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns raw file content from GitLab.
    """

    return {
        "content": gitlab_service.get_file_content(
            project_id,
            file_path,
        )
    }
@app.get("/api/gitlab/projects/{project_id}/branches")
def get_gitlab_branches(
    project_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns all repository branches.
    """

    return gitlab_service.get_branches(project_id)

@app.get("/api/gitlab/projects/{project_id}/commits")
def get_gitlab_commits(
    project_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns recent commits.
    """
    return gitlab_service.get_commits(project_id)

@app.get("/api/gitlab/projects/{project_id}/merge-requests")
def get_gitlab_merge_requests(
    project_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns merge requests.
    """
    return gitlab_service.get_merge_requests(project_id)

@app.post("/api/upload-document")
async def upload_document(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "content_type": file.content_type
    }


@app.get("/api/gitlab/projects/{project_id}/context")
def get_repository_context(
    project_id: int,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns complete repository context.
    """
    return repository_reader.build_repository_context(project_id)

@app.post("/api/context-builder")
def build_context(
    project_id: int,
    prompt: str,
    user: CurrentUser = Depends(get_current_user),
):
    """
    Build complete AI context.
    """

    return context_builder.build_context(
        project_id,
        prompt,
    )