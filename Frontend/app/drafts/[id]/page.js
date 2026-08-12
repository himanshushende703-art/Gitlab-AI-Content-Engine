"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Navbar from "../../../components/layout/Navbar";
import DraftViewer from "../../../components/drafts/DraftViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

export default function DraftDetailPage({ params }) {
  const router = useRouter();
  const jobId = params.id;

  const [auth, setAuth] = useState(null);

  const [job, setJob] = useState(null);
  const [versions, setVersions] = useState([]);
  const [reviews, setReviews] = useState([]); // NEW: reviewer comment/action history

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false); // NEW

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const [refining, setRefining] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(stored);
    setAuth(user);

    loadJob(user.token);
    loadVersions(user.token);
    loadReviews(user.token); // NEW
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  function authHeaders(token, extra = {}) {
    return {
      Authorization: `Bearer ${token}`,
      ...extra,
    };
  }

  async function loadJob(token) {
    setLoadingJob(true);

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs/${jobId}`, {
        headers: authHeaders(token),
      });

      if (!res.ok) {
        throw new Error(`Failed to load draft (${res.status})`);
      }

      const data = await res.json();

      setJob(data);
      setEditing(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoadingJob(false);
    }
  }

  async function loadVersions(token) {
    setLoadingVersions(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/content-jobs/${jobId}/versions`,
        { headers: authHeaders(token) }
      );

      if (!res.ok) {
        throw new Error(`Failed to load versions (${res.status})`);
      }

      const data = await res.json();
      setVersions(data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoadingVersions(false);
    }
  }

  // NEW: fetches the reviewer comment / decision history for this draft
  async function loadReviews(token) {
    setLoadingReviews(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/content-jobs/${jobId}/reviews`,
        { headers: authHeaders(token) }
      );

      if (!res.ok) {
        throw new Error(`Failed to load reviews (${res.status})`);
      }

      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoadingReviews(false);
    }
  }

  function startEditing() {
    if (!job) return;
    setEditTitle(job.draft_title || "");
    setEditContent(job.draft_content || "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function saveEdits() {
    if (!job) return;

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs/${job.job_id}`, {
        method: "PATCH",
        headers: authHeaders(auth.token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          draft_title: editTitle,
          draft_content: editContent,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to save edits (${res.status})`);
      }

      const updated = await res.json();
      setJob(updated);
      setEditing(false);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function deleteJob() {
    if (!job) return;

    if (!window.confirm("Are you sure you want to delete this draft?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs/${job.job_id}`, {
        method: "DELETE",
        headers: authHeaders(auth.token),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to delete draft (${res.status})`);
      }

      router.push("/drafts");
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleReview(action, comment = null) {
    if (!job) return;

    try {
      const res = await fetch(`${API_BASE}/api/drafts/${job.job_id}/review`, {
        method: "POST",
        headers: authHeaders(auth.token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          action,
          reviewer_name: auth.email,
          comment, // NEW: the reviewer's note is now sent along with the decision
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Review action failed (${res.status})`);
      }

      const updated = await res.json();
      setJob(updated);
      loadReviews(auth.token); // NEW: refresh the comment/decision history
    } catch (err) {
      setActionError(err.message);
    }
  }

  // NEW: posts a comment-only review action — does not change job.status
  async function handleComment(commentText) {
    if (!job || !commentText?.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/drafts/${job.job_id}/review`, {
        method: "POST",
        headers: authHeaders(auth.token, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "comment",
          reviewer_name: auth.email,
          comment: commentText.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to post comment (${res.status})`);
      }

      await loadReviews(auth.token);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handlePublish() {
    if (!job) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/publish/export?job_id=${job.job_id}`,
        {
          method: "POST",
          headers: authHeaders(auth.token),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Publish failed (${res.status})`);
      }

      await res.json();
      loadJob(auth.token);
    } catch (err) {
      setActionError(err.message);
    }
  }

  // --- Export (download the approved/published draft as Markdown,
  // without changing its status — Admin only; separate from Publish) ---
  async function handleExport() {
    if (!job) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/content-jobs/${job.job_id}/export`,
        {
          headers: authHeaders(auth.token),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Export failed (${res.status})`);
      }

      const data = await res.json();

      const blob = new Blob([data.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `${job.job_id}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleRefine() {
    if (!job) return;

    setRefining(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/refine?job_id=${job.job_id}`,
        {
          method: "POST",
          headers: authHeaders(auth.token),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Refine failed (${res.status})`);
      }

      const updated = await res.json();
      setJob(updated);
      loadVersions(auth.token);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setRefining(false);
    }
  }

  // --- Submit draft to technical review (locks it from deletion) ---
  async function handleSubmitReview() {
    if (!job) return;

    if (
      !window.confirm(
        "Submit this draft for technical review? Once submitted it can no longer be deleted."
      )
    ) {
      return;
    }

    setSubmittingReview(true);
    setActionError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/submit-review`,
        {
          method: "POST",
          headers: authHeaders(auth.token),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to submit for review (${res.status})`);
      }

      const updated = await res.json();
      setJob(updated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  // NEW: canReview is now status-aware, not just role-aware.
  //
  // BUG FIX ("Approved not working on Technical Viewer"): earlier this
  // was just `["technical_reviewer","doc_lead","admin"].includes(auth.role)`,
  // so a Technical Reviewer kept seeing Accept/Request Revision/Reject on
  // a draft that had already moved on (doc_lead_review / approved /
  // published / failed). Clicking Accept there hit the backend's
  // `job.status != "ready_for_human_review"` check and failed with a 403,
  // which looked like "Approved is not working" for the reviewer. It also
  // meant the "Accepted — sent to Doc Lead" confirmation badge never
  // showed, because that badge only renders once canReview is false.
  //
  // Each role can only act while the job is sitting at THEIR stage:
  //   - Technical Reviewer -> ready_for_human_review
  //   - Doc Lead           -> doc_lead_review
  //   - Admin (override)   -> ready_for_human_review, doc_lead_review, OR
  //                           approved (Admin can still request revision
  //                           or reject an approved doc right up until
  //                           it's published; DraftViewer separately
  //                           hides just the Accept button at "approved"
  //                           since the backend won't allow an admin
  //                           accept from that status).
  // Once their action moves the job past their stage, canReview flips to
  // false, the Accept/Reject/Request Revision buttons disappear (so a
  // reviewer can no longer click Reject after already Accepting), and the
  // confirmation badge takes their place.
  function computeCanReview(job, auth) {
    if (!job || !auth) return false;

    if (auth.role === "technical_reviewer") {
      return job.status === "ready_for_human_review";
    }
    if (auth.role === "doc_lead") {
      return job.status === "doc_lead_review";
    }
    if (auth.role === "admin") {
      return [
        "ready_for_human_review",
        "doc_lead_review",
        "approved",
      ].includes(job.status);
    }
    return false;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar auth={auth} logout={logout} />

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Back link */}
        <Link
          href="/drafts"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition mb-6"
        >
          ← Back to Drafts
        </Link>

        {actionError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-700">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError("")}
              className="ml-4 text-red-500 hover:text-red-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
          {loadingJob ? (
            <p className="text-gray-500">Loading draft...</p>
          ) : !job ? (
            <p className="text-gray-500">Draft not found.</p>
          ) : (
            auth && (
              <DraftViewer
                job={job}
                versions={versions}
                loadingVersions={loadingVersions}
                reviews={reviews}
                loadingReviews={loadingReviews}
                editing={editing}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                editContent={editContent}
                setEditContent={setEditContent}
                auth={auth}
                isOwner={job.owner_email === auth.email}
                // NEW: Admin no longer gets a Delete button on this
                // detail page — only the draft's owner can delete their
                // own draft here. (Admin can still delete from the
                // Drafts list / documents pages if that's kept
                // elsewhere — this change is scoped to the detail
                // page only.)
                canDelete={job.owner_email === auth.email}
                canReview={computeCanReview(job, auth)}
                refining={refining}
                submittingReview={submittingReview}
                startEditing={startEditing}
                saveEdits={saveEdits}
                cancelEditing={cancelEditing}
                handleReview={handleReview}
                handleComment={handleComment}
                handlePublish={handlePublish}
                handleExport={handleExport}
                handleRefine={handleRefine}
                handleSubmitReview={handleSubmitReview}
                deleteJob={deleteJob}
              />
            )
          )}
        </div>
      </div>
    </main>
  );
}