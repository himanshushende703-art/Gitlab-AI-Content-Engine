"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import SavedDrafts from "../../components/drafts/SavedDrafts";
import DraftViewer from "../../components/drafts/DraftViewer";
import Navbar from "../../components/layout/Navbar";


const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

export default function Drafts() {

  const searchParams = useSearchParams();

  const [auth, setAuth] = useState(null);

  const [savedJobs, setSavedJobs] = useState([]);

  const [job, setJob] = useState(null);

  const [versions, setVersions] = useState([]);

  const [reviews, setReviews] = useState([]); // NEW: reviewer comment/action history

  const [loadingJobs, setLoadingJobs] = useState(false);

  const [loadingVersions, setLoadingVersions] = useState(false);

  const [loadingReviews, setLoadingReviews] = useState(false); // NEW

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );

  const [editing, setEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("");

  const [editContent, setEditContent] = useState("");

  const [refining, setRefining] = useState(false);

  const [submittingReview, setSubmittingReview] = useState(false);

  const [actionError, setActionError] = useState("");

  useEffect(() => {

    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (stored) {

      const user = JSON.parse(stored);

      setAuth(user);

      fetchJobs(user.token);

    }

  }, []);


  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${auth?.token}`,
      ...extra,
    };
  }

  async function fetchJobs(token) {

    setLoadingJobs(true);

    try {

      const res = await fetch(
        `${API_BASE}/api/content-jobs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to load drafts (${res.status})`);
      }

      const data = await res.json();

      setSavedJobs(data);

    } catch (err) {

      setActionError(err.message);

    } finally {

      setLoadingJobs(false);

    }

  }

  async function loadJob(id) {

    try {

      const res = await fetch(
        `${API_BASE}/api/content-jobs/${id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to load draft (${res.status})`);
      }

      const data = await res.json();

      setJob(data);

      setEditing(false);

      loadVersions(id);

      loadReviews(id); // NEW

    } catch (err) {

      setActionError(err.message);

    }

  }

  async function loadVersions(id) {

    setLoadingVersions(true);

    try {

      const res = await fetch(
        `${API_BASE}/api/content-jobs/${id}/versions`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
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
  async function loadReviews(id) {

    setLoadingReviews(true);

    try {

      const res = await fetch(
        `${API_BASE}/api/content-jobs/${id}/reviews`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
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

  // --- Editing (manual title/content edit) ---

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

      const res = await fetch(
        `${API_BASE}/api/content-jobs/${job.job_id}`,
        {
          method: "PATCH",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            draft_title: editTitle,
            draft_content: editContent,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to save edits (${res.status})`);
      }

      const updated = await res.json();

      setJob(updated);

      setEditing(false);

      fetchJobs(auth.token);

    } catch (err) {

      setActionError(err.message);

    }

  }

  // --- Delete ---

  async function deleteJob(id) {

    try {

      const res = await fetch(
        `${API_BASE}/api/content-jobs/${id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to delete draft (${res.status})`);
      }

      // Remove the deleted job from state directly instead of
      // re-fetching the whole list — avoids the loading flicker /
      // full-list refresh every time a document is deleted.
      if (job?.job_id === id) {
        setJob(null);
        setVersions([]);
      }

      setSavedJobs((prev) => prev.filter((j) => j.job_id !== id));

    } catch (err) {

      setActionError(err.message);

    }

  }

  // --- Review: accept / request_revision / reject ---

  async function handleReview(action, comment = null) {

    if (!job) return;

    try {

      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/review`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            action,
            reviewer_name: auth.email,
            comment, // NEW: the reviewer's note is now sent along with the decision
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Review action failed (${res.status})`);
      }

      const updated = await res.json();

      setJob(updated);

      fetchJobs(auth.token);

      loadReviews(job.job_id); // NEW: refresh the comment/decision history

    } catch (err) {

      setActionError(err.message);

    }

  }

  // NEW: posts a comment-only review action — does not change job.status
  async function handleComment(commentText) {

    if (!job || !commentText?.trim()) return;

    try {

      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/review`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            action: "comment",
            reviewer_name: auth.email,
            comment: commentText.trim(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to post comment (${res.status})`);
      }

      await loadReviews(job.job_id);

    } catch (err) {

      setActionError(err.message);

    }

  }

  // --- Publish (export approved draft) ---

  async function handlePublish() {

    if (!job) return;

    try {

      const res = await fetch(
        `${API_BASE}/api/publish/export?job_id=${job.job_id}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Publish failed (${res.status})`);
      }

      await res.json();

      loadJob(job.job_id);

      fetchJobs(auth.token);

    } catch (err) {

      setActionError(err.message);

    }

  }

  // --- Export (download the approved/published draft as Markdown, without
  // changing its status — Admin only; separate from Publish) ---

  async function handleExport() {

    if (!job) return;

    try {

      const res = await fetch(
        `${API_BASE}/api/content-jobs/${job.job_id}/export`,
        {
          headers: authHeaders(),
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

  // --- Refine (re-run AI agent workflow) ---

  async function handleRefine() {

    if (!job) return;

    setRefining(true);

    try {

      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/refine?job_id=${job.job_id}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Refine failed (${res.status})`);
      }

      const updated = await res.json();

      setJob(updated);

      loadVersions(job.job_id);

      fetchJobs(auth.token);

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
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to submit for review (${res.status})`);
      }

      const updated = await res.json();

      setJob(updated);

      fetchJobs(auth.token);

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

  const filteredJobs = savedJobs.filter((j) => {

    const search =
      (j.draft_title || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const status =
      statusFilter === "all" ||
      j.status === statusFilter;

    return search && status;

  });

return (
  <main className="min-h-screen bg-gray-50">
    <Navbar auth={auth} logout={logout} />

    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Error banner */}
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

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Draft Management
          </h1>

          <p className="mt-2 text-gray-600">
            Review, edit, refine, and publish AI-generated documentation drafts.
          </p>
        </div>

        <div className="mt-6 lg:mt-0">
          {/* NEW: "Generate New Draft" is only for Writer / Admin —
              Technical Reviewer and Doc Lead only review existing drafts,
              they don't create new ones. */}
          {(auth?.role === "writer" || auth?.role === "admin") && (
            <button
              onClick={() => (window.location.href = "/generate")}
              className="px-6 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition"
            >
              + Generate New Draft
            </button>
          )}
        </div>
      </div>


      {/* Draft List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <SavedDrafts
          loadingJobs={loadingJobs}
          refreshSavedJobs={() => fetchJobs(auth.token)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          filteredJobs={filteredJobs}
          job={job}
          auth={auth}
          loadJob={loadJob}
          deleteJob={deleteJob}
        />
      </div>

      {/* Draft Viewer */}
      {job && auth && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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
            canDelete={job.owner_email === auth.email || auth.role === "admin"}
            canReview={
              // NEW: canReview now checks job.status too, not just role —
              // mirrors the backend's rules in POST /api/drafts/{id}/review.
              // technical_reviewer -> only while ready_for_human_review
              // doc_lead           -> only while doc_lead_review
              // admin              -> ready_for_human_review, doc_lead_review,
              //                       OR approved (Admin can still send an
              //                       approved doc back for revision or
              //                       reject it, right up until it's
              //                       published — DraftViewer hides just
              //                       the Accept button at "approved"
              //                       since the backend doesn't allow an
              //                       admin accept from that status).
              (auth.role === "technical_reviewer" &&
                job.status === "ready_for_human_review") ||
              (auth.role === "doc_lead" &&
                job.status === "doc_lead_review") ||
              (auth.role === "admin" &&
                [
                  "ready_for_human_review",
                  "doc_lead_review",
                  "approved",
                ].includes(job.status))
            }
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
        </div>
      )}
    </div>
  </main>
);

}