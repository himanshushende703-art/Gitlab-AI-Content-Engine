"use client";

import Link from "next/link";
import { FiTrash2 } from "react-icons/fi";


// Statuses a draft moves into once it has been submitted for technical
// review (or further). Mirrors the backend's `protected_statuses` set in
// DELETE /api/content-jobs/{job_id} — a draft in one of these statuses can
// no longer be deleted by the writer.
const PROTECTED_STATUSES = [
  "ready_for_human_review",
  "doc_lead_review",
  "approved",
  "published",
];

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

export default function SavedDrafts({
  loadingJobs,
  refreshSavedJobs,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  filteredJobs,
  job,
  auth,
  loadJob,
  deleteJob,
}) {
  const getStatusStyle = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "published":
        return "bg-purple-100 text-purple-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <section className="rounded-2xl   bg-white p-8">

      {/* Header */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Saved Drafts
          </h2>

          <p className="mt-1 text-gray-500">
            Manage and review AI-generated documentation drafts.
          </p>
        </div>

        <div className="flex items-center gap-4">

          <button
            onClick={refreshSavedJobs}
            className="rounded-xl bg-orange-500 px-5 py-3 text-white font-medium hover:bg-orange-600 transition"
          >
            Refresh
          </button>

        </div>

      </div>

      {/* Search & Filter */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

        <input
          type="text"
          placeholder="Search by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-blue-100 transition"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl text-gray-800 border border-gray-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-blue-100 transition"
        >
          <option value="all">All Status</option>
          <option value="drafting">Draft</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>

      </div>

      {/* Content */}

      {loadingJobs ? (

        <div className="py-16 text-center text-gray-500">
          Loading drafts...
        </div>

      ) : filteredJobs.length === 0 ? (

        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">

          <div className="text-5xl mb-4">📄</div>

          <h3 className="text-xl font-semibold text-gray-800">
            No Drafts Found
          </h3>

          <p className="mt-2 text-gray-500">
            Generate a new document to see drafts here.
          </p>

        </div>

      ) : (

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 scroll-smooth">

          {filteredJobs.map((draft) => (

            <div
              key={draft.job_id}
              className={`rounded-2xl border p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${job?.job_id === draft.job_id
                  ? "border-orange-500 bg-blue-50"
                  : "border-gray-200 bg-white"
                }`}
            >

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                {/* Left */}

                <div className="flex items-start gap-4 flex-1">

                  <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                    📄
                  </div>

                  <div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {draft.draft_title || "Untitled Draft"}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      {draft.owner_email}
                    </p>

                    {/* Generated Date + Time */}
                    <p className="text-sm text-gray-400 mt-1">
                      Generated on {formatDateTime(draft.created_at)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(
                          draft.status
                        )}`}
                      >
                        {draft.status}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                        AI Generated
                      </span>

                    </div>

                  </div>

                </div>

                {/* Right */}

                <div className="flex gap-3">

                  <Link
                    href={`/drafts/${draft.job_id}`}
                    className="rounded-xl bg-orange-500 px-5 py-3 text-white font-medium hover:bg-orange-600 transition text-center"
                  >
                    Open
                  </Link>

                  {auth?.role === "admin" && (
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this draft?")) {
                          deleteJob(draft.job_id);
                        }
                      }}
                      disabled={PROTECTED_STATUSES.includes(draft.status)}
                      title={
                        PROTECTED_STATUSES.includes(draft.status)
                          ? "Submitted drafts cannot be deleted"
                          : "Delete Draft"
                      }
                      aria-label="Delete Draft"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-600"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  )}

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

    </section>
  );
}