"use client";

import { useState } from "react";
import Link from "next/link";


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

export default function DraftViewer({
  job,
  versions,
  loadingVersions,
  reviews, // NEW: full review/comment history for this job
  loadingReviews, // NEW
  editing,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  auth,
  isOwner,
  canDelete,
  canReview,
  refining,
  startEditing,
  saveEdits,
  cancelEditing,
  handleReview,
  handlePublish,
  handleExport, // NEW: Admin-only — download the approved/published draft as Markdown without changing its status
  handleRefine,
  handleSubmitReview, // NEW: parent-provided handler that calls the API to submit job for technical review
  deleteJob,
}) {

  const [expandedVersionId, setExpandedVersionId] = useState(null);
  const [submitting, setSubmitting] = useState(false); // NEW: local loading state for submit action
  const [decisionSubmitting, setDecisionSubmitting] = useState(null); // NEW: which of accept/revision/reject is in flight
  const [revisionPending, setRevisionPending] = useState(false); // NEW: true once "Request Revision" has been clicked once, revealing the comment textarea
  const [revisionComment, setRevisionComment] = useState(""); // NEW: text typed in the revision-only textarea
  const [exporting, setExporting] = useState(false); // NEW: local loading state for the Export action

  if (!job) return null;

  // NEW: once this reviewer's action has moved the job past their stage
  // (canReview becomes false), show a small confirmation instead of the
  // buttons just disappearing with no feedback.
  const reviewedBadge = (() => {
    if (canReview || !auth) return null;

    if (auth.role === "technical_reviewer") {
      if (job.status === "doc_lead_review")
        return { text: "Accepted — sent to Doc Lead for review", tone: "green" };
      if (job.status === "failed")
        return { text: "Rejected", tone: "red" };
    }

    if (auth.role === "doc_lead") {
      if (job.status === "approved")
        return { text: "Accepted — document approved", tone: "green" };
      if (job.status === "failed")
        return { text: "Rejected", tone: "red" };
    }

    return null;
  })();

  // Once a draft leaves "drafting" status (i.e. it has been submitted for
  // technical review or moved further down the pipeline), the writer can no
  // longer delete it. Mirrors the `protected_statuses` set enforced on the
  // backend in the DELETE /api/content-jobs/{job_id} endpoint.
  const isSubmittedForReview = [
    "ready_for_human_review",
    "doc_lead_review",
    "approved",
    "published",
  ].includes(job.status);

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-600";
      case "published":
        return "bg-purple-600";
      case "failed":
        return "bg-red-600";
      case "submitted":
      case "in_review":
        return "bg-indigo-600";
      default:
        return "bg-yellow-500";
    }
  };

  // NEW: wraps the parent's handleSubmitReview call with a local loading state
  const onSubmitForReview = async () => {
    if (!handleSubmitReview) return;
    try {
      setSubmitting(true);
      await handleSubmitReview(job.job_id);
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Accept / Reject submit immediately with no comment (the old
  // shared comment box has been removed).
  const onReviewAction = async (action) => {
    if (!handleReview) return;
    try {
      setDecisionSubmitting(action);
      await handleReview(action, null);
    } finally {
      setDecisionSubmitting(null);
    }
  };

  // NEW: "Request Revision" is now a two-step click. First click just
  // reveals a plain textarea (no separate comment/post button) so the
  // reviewer can type why revision is needed. Second click (with the
  // textarea now filled in) actually submits the request_revision action.
  const onRequestRevisionClick = async () => {
    if (!revisionPending) {
      setRevisionPending(true);
      return;
    }
    if (!handleReview) return;
    const text = revisionComment.trim();
    try {
      setDecisionSubmitting("request_revision");
      await handleReview("request_revision", text || null);
      setRevisionComment("");
      setRevisionPending(false);
    } finally {
      setDecisionSubmitting(null);
    }
  };

  const cancelRevision = () => {
    setRevisionPending(false);
    setRevisionComment("");
  };

  // NEW: Admin can Request Revision / Reject an "approved" doc as an
  // override (backend allows this from any status), but Accept is NOT
  // valid for Admin once the doc is already "approved" — only a Doc Lead
  // moves it there, and the backend rejects an admin accept from that
  // status. So Accept is hidden in just that one case.
  const canAccept =
    canReview && !(auth?.role === "admin" && job.status === "approved");

  // NEW: Export (Admin only) — downloads the draft as Markdown without
  // changing job.status. Separate from Publish, which moves an
  // "approved" doc to "published". Export works on "approved" OR
  // "published" docs, so Admin can re-download after publishing too.
  const canExport =
    auth?.role === "admin" && ["approved", "published"].includes(job.status);

  const onExportClick = async () => {
    if (!handleExport) return;
    try {
      setExporting(true);
      await handleExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="text-gray-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        {editing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 bg-white border border-gray-300 rounded-lg p-3 text-xl font-semibold text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        ) : (
          <h2 className="text-2xl lg:text-3xl font-bold break-words text-gray-900">
            {job.draft_title}
          </h2>
        )}

        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${getStatusColor(
            job.status
          )}`}
        >
          {job.status}
        </span>
      </div>

      {/* Generated / Updated date-time */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 mb-6">
        <span>Generated on {formatDateTime(job.created_at)}</span>
        {job.updated_at && job.updated_at !== job.created_at && (
          <span>Last updated {formatDateTime(job.updated_at)}</span>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={16}
          className="w-full bg-white border border-gray-300 rounded-xl p-4 text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
      ) : job.status === "intake" && !job.draft_content ? (
        // "intake" jobs have no draft_content yet — the AI workflow
        // (Step 2, /generate/preview/[id]) hasn't been run on them yet.
        // Without this, the content area just rendered blank with no
        // explanation of why, which looked like a bug on the dashboard.
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mb-4 h-10 w-10 text-gray-400"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-base font-semibold text-gray-900">
            Draft not yet generated
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            This document is still at the intake stage. Run the AI workflow
            to generate its first draft before it can be reviewed or edited.
          </p>
          <Link
            href={`/generate/preview/${job.job_id}`}
            className="mt-5 inline-flex items-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
          >
            Generate Draft
          </Link>
        </div>
      ) : (
        <article className="whitespace-pre-wrap leading-8 text-gray-700">
          {job.draft_content}
        </article>
      )}

      {/* Risk Flags */}
      {!editing && job.risk_flags?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-yellow-600 mb-3">
            Risk Flags
          </h3>

          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {job.risk_flags.map((flag, index) => (
              <li key={index}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {!editing && job.assumptions?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-blue-600 mb-3">
            Assumptions
          </h3>

          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {job.assumptions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* NEW: Revision comment textarea — only appears after "Request Revision"
          has been clicked once. Plain textarea, no separate comment/post
          button; clicking "Request Revision" again submits it. */}
      {canReview && revisionPending && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Revision comments
          </label>
          <textarea
            value={revisionComment}
            onChange={(e) => setRevisionComment(e.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. Please add error-handling details in section 2 before resubmitting..."
            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-4">
        {canReview && (
          <>
            {!revisionPending && canAccept && (
              <button
                onClick={() => onReviewAction("accept")}
                disabled={decisionSubmitting !== null}
                className="bg-green-600 hover:bg-green-500 transition px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {decisionSubmitting === "accept" ? "Submitting..." : "Accept"}
              </button>
            )}

            <button
              onClick={onRequestRevisionClick}
              disabled={decisionSubmitting !== null}
              className="bg-yellow-500 hover:bg-yellow-400 transition px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {decisionSubmitting === "request_revision"
                ? "Submitting..."
                : revisionPending
                  ? "Confirm Request Revision"
                  : "Request Revision"}
            </button>

            {revisionPending && (
              <button
                onClick={cancelRevision}
                disabled={decisionSubmitting !== null}
                className="bg-gray-200 hover:bg-gray-300 transition px-5 py-2 rounded-lg text-gray-700 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            {!revisionPending && (
              <button
                onClick={() => onReviewAction("reject")}
                disabled={decisionSubmitting !== null}
                className="bg-red-600 hover:bg-red-500 transition px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {decisionSubmitting === "reject" ? "Submitting..." : "Reject"}
              </button>
            )}
          </>
        )}

        {/* NEW: confirmation badge shown once this reviewer's action has
            moved the job past their stage (canReview is now false) */}
        {!canReview && reviewedBadge && (
          <span
            className={`px-5 py-2 rounded-lg font-medium ${reviewedBadge.tone === "green"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}
          >
            {reviewedBadge.text}
          </span>
        )}

        {/* NEW: Publish is Admin-only. Doc Lead's job ends at Accept
            (which moves the doc to "approved") — only Admin performs the
            final publish/export step (mirrors POST /api/publish/export,
            which already requires Role.admin on the backend). */}
        {job.status === "approved" && auth?.role === "admin" && (
          <button
            onClick={handlePublish}
            className="bg-purple-600 hover:bg-purple-500 transition px-5 py-2 rounded-lg text-white font-medium"
          >
            Publish
          </button>
        )}

        {/* NEW: once published, link to the read-only published viewer */}
        {job.status === "published" && (
          <Link
            href={`/published/${job.job_id}`}
            className="bg-purple-600 hover:bg-purple-500 transition px-5 py-2 rounded-lg text-white font-medium"
          >
            View Published Page
          </Link>
        )}

        {/* NEW: Export (Admin only) — downloads the current Markdown
            without publishing. Available once the doc is approved, and
            stays available after publishing too, so Admin can re-download
            any time. */}
        {canExport && (
          <button
            onClick={onExportClick}
            disabled={exporting}
            className="bg-indigo-600 hover:bg-indigo-500 transition px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export"}
          </button>
        )}

        {isOwner && !editing && (
          <>


            {/* NEW: Submit for Technical Review button */}
            {!isSubmittedForReview && (
              <button
                onClick={onSubmitForReview}
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600 transition px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit for Technical Review"}
              </button>
            )}

            <button
              onClick={startEditing}
              className="bg-gray-200 hover:bg-gray-300 transition px-5 py-2 rounded-lg text-gray-900 font-medium"
            >
              Edit
            </button>
          </>
        )}


        {canDelete && !editing && (
          <button
            onClick={() => deleteJob(job.job_id)}
            disabled={isSubmittedForReview} // NEW: Delete disabled once submitted for review
            className="bg-red-700 hover:bg-red-600 transition px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        )}

        {editing && (
          <>
            <button
              onClick={saveEdits}
              className="bg-green-600 hover:bg-green-500 transition px-5 py-2 rounded-lg text-white font-medium"
            >
              Save
            </button>

            <button
              onClick={cancelEditing}
              className="bg-gray-200 hover:bg-gray-300 transition px-5 py-2 rounded-lg text-gray-900 font-medium"
            >
              Cancel
            </button>
          </>
        )}
      </div>


      {/* Version History */}
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h3 className="text-xl font-semibold mb-5 text-gray-900">
          Version History
        </h3>

        {loadingVersions ? (
          <p className="text-gray-500">
            Loading version history...
          </p>
        ) : versions.length === 0 ? (
          <p className="text-gray-500">
            No versions available.
          </p>
        ) : (
          <div className="space-y-4">
            {versions.map((version, index) => {
              const versionKey = version.id ?? version.version_id ?? index;
              const isExpanded = expandedVersionId === versionKey;
              const isLatest = index === versions.length - 1;

              return (
                <div
                  key={versionKey}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">
                        Version {version.version_number ?? index + 1}
                      </h4>

                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {formatDateTime(version.created_at)}
                      </span>


                      <button
                        onClick={() =>
                          setExpandedVersionId(isExpanded ? null : versionKey)
                        }
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                      >
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-gray-700">
                    {version.draft_title ||
                      version.title ||
                      "Untitled Draft"}
                  </p>


                  {isExpanded && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                      <article className="whitespace-pre-wrap leading-7 text-sm text-gray-700">
                        {version.draft_content || "No content for this version."}
                      </article>

                      {version.risk_flags?.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-yellow-600 mb-2">
                            Risk Flags
                          </h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {version.risk_flags.map((flag, i) => (
                              <li key={i}>{flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {version.assumptions?.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-sm font-semibold text-blue-600 mb-2">
                            Assumptions
                          </h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {version.assumptions.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW: Reviewer Comments / Review History — visible to writer & reviewers */}
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h3 className="text-xl font-semibold mb-5 text-gray-900">
          Reviewer Comments
        </h3>

        {loadingReviews ? (
          <p className="text-gray-500">Loading review history...</p>
        ) : !reviews || reviews.length === 0 ? (
          <p className="text-gray-500">No reviewer comments yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {review.reviewer_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${review.action === "accept"
                          ? "bg-green-100 text-green-700"
                          : review.action === "reject"
                            ? "bg-red-100 text-red-700"
                            : review.action === "request_revision"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                    >
                      {review.action.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(review.created_at)}
                  </span>
                </div>

                {review.comment && (
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}