"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiEye, FiDownload, FiTrash2, FiFileText } from "react-icons/fi";

import Navbar from "../../../components/layout/Navbar";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";


const STATUS_META = {
  all: { label: "All Documents", badge: "bg-blue-100 text-blue-700" },
  drafting: { label: "Draft Documents", badge: "bg-yellow-100 text-yellow-700" },
  // NEW: pseudo-status — not a real job.status value, it's derived from
  // the revision_requested flag (see fetchJobs below) so drafts sent
  // back by a reviewer can be listed separately from fresh drafts.
  revision_required: { label: "Revision Required", badge: "bg-orange-100 text-orange-700" },
  ready_for_human_review: { label: "Pending Review", badge: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved Documents", badge: "bg-green-100 text-green-700" },
  published: { label: "Published Documents", badge: "bg-purple-100 text-purple-700" },
  failed: { label: "Failed / Rejected Documents", badge: "bg-red-100 text-red-700" },
};

function formatDateTime(value) {
  if (!value) return "Unknown";

  let isoValue = value;
  if (typeof isoValue === "string" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(isoValue)) {
    isoValue = `${isoValue}Z`;
  }

  const date = new Date(isoValue);
  if (isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DocumentsByCategoryPage({ params }) {
  const router = useRouter();
  const status = params.status; // "all" | "drafting" | "approved" | "published" | "failed"

  const [auth, setAuth] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null); // NEW: job_id currently running an admin action (disables its buttons)

  const meta = STATUS_META[status] || STATUS_META.all;

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(stored);
    setAuth(user);

    fetchJobs(user.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function fetchJobs(token) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load documents (${res.status})`);
      }

      const data = await res.json();

      // NEW: "revision_required" isn't a real job.status — it's the
      // revision_requested flag (true when a reviewer/doc lead sent this
      // job back with "request_revision"). Filter on that instead of
      // job.status for this one pseudo-category.
      const filtered =
        status === "all"
          ? data
          : status === "revision_required"
          ? data.filter((j) => j.revision_requested)
          : data.filter((j) => j.status === status);

      setJobs(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(jobId, ownerEmail) {
    const isOwner = ownerEmail === auth?.email;
    const isAdmin = auth?.role === "admin";
    if (!isOwner && !isAdmin) return;

    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to delete (${res.status})`);
      }

      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    } catch (err) {
      setError(err.message);
    }
  }

  // NEW: shared handler for Admin's review-override actions (Reject /
  // Request Revision) straight from the document list, without opening
  // the draft. Mirrors POST /api/drafts/{job_id}/review used elsewhere
  // (DraftViewer.jsx) — admin can call this regardless of exact stage.
  async function handleReviewAction(jobId, action) {
    if (!auth) return;

    const confirmText =
      action === "reject"
        ? "Reject this document? Its status will move to Failed."
        : "Send this document back for revision? Its status will move to Drafting.";

    if (!window.confirm(confirmText)) return;

    setActioningId(jobId);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/drafts/${jobId}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reviewer_name: auth.email,
          comment: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Action failed (${res.status})`);
      }

      const updated = await res.json();

      setJobs((prev) =>
        status !== "all" && updated.status !== status
          ? prev.filter((j) => j.job_id !== jobId)
          : prev.map((j) => (j.job_id === jobId ? updated : j))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  // NEW: Admin publishes an "approved" document directly from the list
  // (mirrors handlePublish in app/drafts/[id]/page.js — same endpoint).
  async function handlePublish(jobId) {
    if (!auth) return;

    setActioningId(jobId);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/publish/export?job_id=${jobId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Publish failed (${res.status})`);
      }

      const data = await res.json();

      setJobs((prev) =>
        status !== "all" && status !== "published"
          ? prev.filter((j) => j.job_id !== jobId)
          : prev.map((j) =>
              j.job_id === jobId ? { ...j, status: "published" } : j
            )
      );

      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningId(null);
    }
  }

  // NEW: "Export" — downloads the draft as a .md file to the admin's
  // machine. This does NOT call /api/publish/export (that endpoint also
  // flips the status to "published" and only accepts "approved" jobs —
  // calling it again on an already-published doc would just error out).
  // Export is a read-only download of whatever content the job already
  // has, so it works from any status.
  function handleExport(job) {
    const markdown = `# ${job.draft_title || "Untitled Draft"}\n\n${
      job.draft_content || ""
    }\n`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
     const safeTitle = (job.draft_title || "Untitled Draft")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "_");

    link.download = `${safeTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar auth={auth} logout={logout} />

      <div className="max-w-6xl mx-auto px-6 py-8">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition mb-6"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {meta.label}
              </h1>
              <p className="mt-2 text-gray-500">
                {loading ? "Loading..." : `${jobs.length} document(s) found`}
              </p>
            </div>

            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${meta.badge}`}>
              {status}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading documents...</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center bg-white">
            <div className="text-5xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-gray-800">
              No documents in this category
            </h3>
            <p className="mt-2 text-gray-500">
              Try a different category from the Dashboard.
            </p>
          </div>
        ) : (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 scroll-smooth">
            {jobs.map((job) => (
              <div
                key={job.job_id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                      📄
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.draft_title || "Untitled Draft"}
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        {job.owner_email}
                      </p>

                      <p className="text-sm text-gray-400 mt-1">
                        Generated on {formatDateTime(job.created_at)}
                      </p>

                      {/* NEW: revision badge + reviewer comment take
                          priority over the plain status badge, since
                          job.status is still just "drafting" here. */}
                      {job.revision_requested ? (
                        <>
                          <span className="inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                            revision requested
                          </span>
                          {job.latest_review_comment && (
                            <p className="text-sm text-orange-600 mt-2">
                              Reviewer note: {job.latest_review_comment}
                            </p>
                          )}
                        </>
                      ) : (
                        <span
                          className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_META[job.status]?.badge || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* NEW: for published documents, link straight to the
                        read-only published viewer instead of (or in
                        addition to) the internal draft editor. */}
                    {job.status === "published" && (
                      <Link
                        href={`/published/${job.job_id}`}
                        className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-white font-medium hover:bg-purple-500 transition text-center"
                      >
                        <FiEye size={16} />
                        
                      </Link>
                    )}

                    <Link
                      href={`/drafts/${job.job_id}`}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-white font-medium hover:bg-orange-600 transition text-center"
                    >
                      <FiFileText size={16} />
                      
                    </Link>

                    {/* NEW: Admin-only quick actions, directly from the
                        document list — no need to open the draft first.
                        Each button only shows when the job's current
                        status makes that action valid (mirrors the rules
                        enforced on the backend). */}
                    {auth?.role === "admin" && (
                      <>
                        {job.status === "approved" && (
                          <button
                            onClick={() => handlePublish(job.job_id)}
                            disabled={actioningId === job.job_id}
                            className="rounded-xl bg-purple-600 px-4 py-3 text-white font-medium hover:bg-purple-500 transition disabled:opacity-50"
                          >
                            {actioningId === job.job_id ? "Publishing..." : "Publish"}
                          </button>
                        )}

                        {["ready_for_human_review", "doc_lead_review", "approved"].includes(
                          job.status
                        ) && (
                          <>
                            <button
                              onClick={() => handleReviewAction(job.job_id, "request_revision")}
                              disabled={actioningId === job.job_id}
                              className="rounded-xl bg-yellow-500 px-4 py-3 text-white font-medium hover:bg-yellow-400 transition disabled:opacity-50"
                            >
                              {actioningId === job.job_id ? "Working..." : "Request Revision"}
                            </button>

                            <button
                              onClick={() => handleReviewAction(job.job_id, "reject")}
                              disabled={actioningId === job.job_id}
                              className="rounded-xl bg-red-600 px-4 py-3 text-white font-medium hover:bg-red-500 transition disabled:opacity-50"
                            >
                              {actioningId === job.job_id ? "Working..." : "Reject"}
                            </button>
                          </>
                        )}

                        {job.draft_content && (
                          <button
                            onClick={() => handleExport(job)}
                            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 font-medium hover:bg-gray-100 transition"
                          >
                            <FiDownload size={16} />
                            
                          </button>
                        )}
                      </>
                    )}

                    {/* NEW: delete is admin-only (matches canDelete rules
                        elsewhere in the app and the backend's admin-only
                        DELETE /api/content-jobs/{id}) */}
                    {auth?.role === "admin" && (
                      <button
                        onClick={() =>
                          job.status !== "ready_for_human_review" &&
                          handleDelete(job.job_id, job.owner_email)
                        }
                        disabled={job.status === "ready_for_human_review"}
                        title={
                          job.status === "ready_for_human_review"
                            ? "This draft has been submitted for technical review and can no longer be deleted."
                            : undefined
                        }
                        className={`flex items-center gap-2 rounded-xl border px-4 py-3 font-medium transition ${
                          job.status === "ready_for_human_review"
                            ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                        }`}
                      >
                        <FiTrash2 size={16} />
                        
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}