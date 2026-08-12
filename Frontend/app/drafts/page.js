"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import SavedDrafts from "../../components/drafts/SavedDrafts";
import DraftViewer from "../../components/drafts/DraftViewer";
import Navbar from "../../components/layout/Navbar";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

function DraftsContent() {
  const searchParams = useSearchParams();

  const [auth, setAuth] = useState(null);

  const [savedJobs, setSavedJobs] = useState([]);
  const [job, setJob] = useState(null);
  const [versions, setVersions] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingVersions, setLoadingVersions] =
    useState(false);
  const [loadingReviews, setLoadingReviews] =
    useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const [refining, setRefining] = useState(false);
  const [submittingReview, setSubmittingReview] =
    useState(false);

  const [actionError, setActionError] = useState("");

  // =========================================================
  // AUTH
  // =========================================================

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(AUTH_STORAGE_KEY);

      if (!stored) {
        return;
      }

      const user = JSON.parse(stored);

      if (!user?.token) {
        return;
      }

      setAuth(user);

      fetchJobs(user.token);
    } catch (err) {
      console.error(
        "Failed to load authentication:",
        err
      );

      setActionError(
        "Unable to load your authentication session."
      );
    }
  }, []);

  // =========================================================
  // AUTH HEADERS
  // =========================================================

  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${auth?.token}`,
      ...extra,
    };
  }

  // =========================================================
  // FETCH JOBS
  // =========================================================

  async function fetchJobs(token) {
    if (!token) {
      return;
    }

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
        throw new Error(
          `Failed to load drafts (${res.status})`
        );
      }

      const data = await res.json();

      setSavedJobs(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Fetch drafts error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to load drafts."
      );
    } finally {
      setLoadingJobs(false);
    }
  }

  // =========================================================
  // LOAD SINGLE JOB
  // =========================================================

  async function loadJob(id) {
    if (!auth?.token || !id) {
      return;
    }

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
        throw new Error(
          `Failed to load draft (${res.status})`
        );
      }

      const data = await res.json();

      setJob(data);
      setEditing(false);

      loadVersions(id);
      loadReviews(id);
    } catch (err) {
      console.error("Load draft error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to load draft."
      );
    }
  }

  // =========================================================
  // LOAD VERSIONS
  // =========================================================

  async function loadVersions(id) {
    if (!auth?.token || !id) {
      return;
    }

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
        throw new Error(
          `Failed to load versions (${res.status})`
        );
      }

      const data = await res.json();

      setVersions(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Load versions error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to load versions."
      );
    } finally {
      setLoadingVersions(false);
    }
  }

  // =========================================================
  // LOAD REVIEWS
  // =========================================================

  async function loadReviews(id) {
    if (!auth?.token || !id) {
      return;
    }

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
        throw new Error(
          `Failed to load reviews (${res.status})`
        );
      }

      const data = await res.json();

      setReviews(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Load reviews error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to load reviews."
      );
    } finally {
      setLoadingReviews(false);
    }
  }

  // =========================================================
  // EDITING
  // =========================================================

  function startEditing() {
    if (!job) {
      return;
    }

    setEditTitle(job.draft_title || "");
    setEditContent(job.draft_content || "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function saveEdits() {
    if (!job || !auth?.token) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/content-jobs/${job.job_id}`,
        {
          method: "PATCH",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            draft_title: editTitle,
            draft_content: editContent,
          }),
        }
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Failed to save edits (${res.status})`
        );
      }

      const updated = await res.json();

      setJob(updated);
      setEditing(false);

      fetchJobs(auth.token);
    } catch (err) {
      console.error("Save edits error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to save edits."
      );
    }
  }

  // =========================================================
  // DELETE
  // =========================================================

  async function deleteJob(id) {
    if (!auth?.token || !id) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/content-jobs/${id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Failed to delete draft (${res.status})`
        );
      }

      if (job?.job_id === id) {
        setJob(null);
        setVersions([]);
        setReviews([]);
      }

      setSavedJobs((prev) =>
        prev.filter((j) => j.job_id !== id)
      );
    } catch (err) {
      console.error("Delete draft error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to delete draft."
      );
    }
  }

  // =========================================================
  // REVIEW
  // =========================================================

  async function handleReview(
    action,
    comment = null
  ) {
    if (!job || !auth?.token) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/review`,
        {
          method: "POST",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            action,
            reviewer_name: auth.email,
            comment,
          }),
        }
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Review action failed (${res.status})`
        );
      }

      const updated = await res.json();

      setJob(updated);

      fetchJobs(auth.token);
      loadReviews(job.job_id);
    } catch (err) {
      console.error("Review action error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Review action failed."
      );
    }
  }

  // =========================================================
  // COMMENT
  // =========================================================

  async function handleComment(commentText) {
    if (
      !job ||
      !auth?.token ||
      !commentText?.trim()
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/drafts/${job.job_id}/review`,
        {
          method: "POST",
          headers: authHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            action: "comment",
            reviewer_name: auth.email,
            comment: commentText.trim(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Failed to post comment (${res.status})`
        );
      }

      await loadReviews(job.job_id);
    } catch (err) {
      console.error("Comment error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to post comment."
      );
    }
  }

  // =========================================================
  // PUBLISH
  // =========================================================

  async function handlePublish() {
    if (!job || !auth?.token) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/publish/export?job_id=${job.job_id}`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Publish failed (${res.status})`
        );
      }

      await res.json();

      loadJob(job.job_id);
      fetchJobs(auth.token);
    } catch (err) {
      console.error("Publish error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Publish failed."
      );
    }
  }

  // =========================================================
  // EXPORT
  // =========================================================

  async function handleExport() {
    if (!job || !auth?.token) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/content-jobs/${job.job_id}/export`,
        {
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Export failed (${res.status})`
        );
      }

      const data = await res.json();

      const blob = new Blob(
        [data.markdown],
        {
          type: "text/markdown",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;
      a.download =
        data.filename ||
        `${job.job_id}.md`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Export failed."
      );
    }
  }

  // =========================================================
  // REFINE
  // =========================================================

  async function handleRefine() {
    if (!job || !auth?.token) {
      return;
    }

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
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Refine failed (${res.status})`
        );
      }

      const updated = await res.json();

      setJob(updated);

      loadVersions(job.job_id);
      fetchJobs(auth.token);
    } catch (err) {
      console.error("Refine error:", err);

      setActionError(
        err instanceof Error
          ? err.message
          : "Refine failed."
      );
    } finally {
      setRefining(false);
    }
  }

  // =========================================================
  // SUBMIT REVIEW
  // =========================================================

  async function handleSubmitReview() {
    if (!job || !auth?.token) {
      return;
    }

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
        const err = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          err.detail ||
            `Failed to submit for review (${res.status})`
        );
      }

      const updated = await res.json();

      setJob(updated);

      fetchJobs(auth.token);
    } catch (err) {
      console.error(
        "Submit review error:",
        err
      );

      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to submit for review."
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function logout() {
    localStorage.removeItem(
      AUTH_STORAGE_KEY
    );

    window.location.href = "/login";
  }

  // =========================================================
  // FILTER
  // =========================================================

  const filteredJobs = savedJobs.filter((j) => {
    const search =
      (j.draft_title || "")
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        );

    const status =
      statusFilter === "all" ||
      j.status === statusFilter;

    return search && status;
  });

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar
        auth={auth}
        logout={logout}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error banner */}

        {actionError && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-700">
            <span>{actionError}</span>

            <button
              onClick={() =>
                setActionError("")
              }
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
              Review, edit, refine, and publish
              AI-generated documentation drafts.
            </p>
          </div>

          <div className="mt-6 lg:mt-0">
            {(auth?.role === "writer" ||
              auth?.role === "admin") && (
              <button
                onClick={() =>
                  (window.location.href =
                    "/generate")
                }
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
            refreshSavedJobs={() =>
              auth?.token &&
              fetchJobs(auth.token)
            }
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
              isOwner={
                job.owner_email === auth.email
              }
              canDelete={
                job.owner_email ===
                  auth.email ||
                auth.role === "admin"
              }
              canReview={
                (auth.role ===
                  "technical_reviewer" &&
                  job.status ===
                    "ready_for_human_review") ||
                (auth.role === "doc_lead" &&
                  job.status ===
                    "doc_lead_review") ||
                (auth.role === "admin" &&
                  [
                    "ready_for_human_review",
                    "doc_lead_review",
                    "approved",
                  ].includes(job.status))
              }
              refining={refining}
              submittingReview={
                submittingReview
              }
              startEditing={startEditing}
              saveEdits={saveEdits}
              cancelEditing={cancelEditing}
              handleReview={handleReview}
              handleComment={handleComment}
              handlePublish={handlePublish}
              handleExport={handleExport}
              handleRefine={handleRefine}
              handleSubmitReview={
                handleSubmitReview
              }
              deleteJob={deleteJob}
            />
          </div>
        )}
      </div>
    </main>
  );
}

/*
 * IMPORTANT:
 *
 * useSearchParams() is used inside DraftsContent.
 * The Suspense boundary prevents Next.js from
 * failing during production prerendering.
 */

export default function DraftsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="mx-auto w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />

            <p className="mt-4 text-gray-600 font-medium">
              Loading drafts...
            </p>
          </div>
        </main>
      }
    >
      <DraftsContent />
    </Suspense>
  );
}