"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Navbar from "../../components/layout/Navbar";
import ChartsDashboard from "../../components/analytics/ChartsDashboard";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

function formatDateTime(value) {
  if (!value) return "Unknown";
  let iso = value;
  if (typeof iso === "string" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso = `${iso}Z`;
  }
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_BADGE = {
  approved: "bg-green-100 text-green-700",
  published: "bg-purple-100 text-purple-700",
  failed: "bg-red-100 text-red-700",
  ready_for_human_review: "bg-blue-100 text-blue-700",
};

function statusBadge(status) {
  return STATUS_BADGE[status] || "bg-yellow-100 text-yellow-700";
}

// ---------- reusable pieces ----------

function StatCard({ label, value, color, status }) {
  const router = useRouter();
  const clickable = Boolean(status);

  return (
    <div
      onClick={clickable ? () => router.push(`/documents/${status}`) : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => e.key === "Enter" && router.push(`/documents/${status}`)
          : undefined
      }
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition ${clickable ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5" : ""
        }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h3>
      {clickable && (
        <p className="mt-2 text-xs font-medium text-gray-400">Click to view →</p>
      )}
    </div>
  );
}

function JobRow({ job, onPublish, publishingId }) {
  const isPublishing = publishingId === job.job_id;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900">
          {job.draft_title || "Untitled Draft"}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {job.owner_email} • {formatDateTime(job.created_at)}
        </p>
        {/* NEW: show why this draft was sent back, right on the card */}
        {job.revision_requested && job.latest_review_comment && (
          <p className="text-xs text-orange-600 mt-1 truncate">
            Reviewer note: {job.latest_review_comment}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* NEW: revision badge takes priority over the plain status badge */}
        {job.revision_requested ? (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            revision requested
          </span>
        ) : (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge(job.status)}`}>
            {job.status}
          </span>
        )}

        {/* NEW: publish directly from the dashboard — only for approved
            jobs, and only when the parent (admin dashboard) passed a
            handler down. */}
        {onPublish && job.status === "approved" && (
          <button
            onClick={() => onPublish(job.job_id)}
            disabled={isPublishing}
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm text-white font-medium hover:bg-purple-500 transition disabled:opacity-50"
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </button>
        )}

        <Link
          href={`/drafts/${job.job_id}`}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white font-medium hover:bg-orange-600 transition"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

function Section({ title, count, jobs, emptyText, onPublish, publishingId }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-400">{count} item(s)</span>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {jobs.slice(0, 20).map((job) => (
            <JobRow key={job.job_id} job={job} onPublish={onPublish} publishingId={publishingId} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuccessRateCard({ label, numerator, total }) {
  const rate = total > 0 ? Math.round((numerator / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="text-2xl font-bold text-green-600">{rate}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {numerator} of {total}
      </p>
    </div>
  );
}

const IN_PROGRESS_STATUSES = [
  "intake",
  "context_preparation",
  "drafting",
  "technical_review",
  "tone_optimization",
];

export default function DashboardPage() {
  const router = useRouter();

  const [auth, setAuth] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishingId, setPublishingId] = useState(null); // NEW: which job is currently being published

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      router.push("/login");
      return;
    }

    const authData = JSON.parse(stored);
    setAuth(authData);

    loadDashboard(authData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboard(authData) {
    setLoading(true);
    setError("");

    try {
      const headers = { Authorization: `Bearer ${authData.token}` };

      const jobsRes = await fetch(`${API_BASE}/api/content-jobs`, { headers });
      if (!jobsRes.ok) throw new Error(`Failed to load jobs (${jobsRes.status})`);
      setJobs(await jobsRes.json());

      const metricsRes = await fetch(`${API_BASE}/api/metrics`, { headers });
      if (metricsRes.ok) setMetrics(await metricsRes.json());

      // Admin-only extra data 
      if (authData.role === "admin") {
        const usersRes = await fetch(`${API_BASE}/api/admin/users`, { headers });
        if (usersRes.ok) setUsers(await usersRes.json());

        const logsRes = await fetch(`${API_BASE}/api/admin/logs?limit=50`, { headers });
        if (logsRes.ok) setLogs(await logsRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  // NEW: admin publishes an approved document directly from the dashboard,
  // without needing to open the draft first.
  async function handlePublish(jobId) {
    if (!auth) return;

    try {
      setPublishingId(jobId);

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

      await res.json();

      // Refresh so "Ready to Publish" and "Published" counts update.
      loadDashboard(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishingId(null);
    }
  }

  if (!auth) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar auth={auth} logout={logout} />

      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-orange-700 via-red-500 to-orange-400 p-10 text-white shadow-xl">
          <span className="rounded-full bg-white/20 px-4 py-1 text-sm font-medium">
            {auth.role.replaceAll("_", " ")}
          </span>
          <h1 className="mt-4 text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-orange-50">
            {auth.email}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading dashboard...</p>
        ) : (
          <>
            {auth.role === "writer" && <WriterDashboard jobs={jobs} auth={auth} />}
            {auth.role === "technical_reviewer" && <ReviewerDashboard jobs={jobs} />}
            {auth.role === "doc_lead" && <DocLeadDashboard jobs={jobs} />}
            {auth.role === "admin" && (
              <AdminDashboard
                jobs={jobs}
                metrics={metrics}
                users={users}
                logs={logs}
                onPublish={handlePublish}
                publishingId={publishingId}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ==================== WRITER ====================

function WriterDashboard({ jobs, auth }) {
  const mine = jobs.filter((j) => j.owner_email === auth.email);

  // NEW: jobs a Technical Reviewer / Doc Lead sent back with
  // "request_revision" are shown in their own section, separate from
  // "My Drafts", using the revision_requested flag from /api/content-jobs.
  const revisionRequired = mine.filter((j) => j.revision_requested);
  const myDrafts = mine.filter(
    (j) => IN_PROGRESS_STATUSES.includes(j.status) && !j.revision_requested
  );
  const pending = mine.filter((j) => j.status === "ready_for_human_review");
  const rejected = mine.filter((j) => j.status === "failed");
  const published = mine.filter((j) => j.status === "published");

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard label="My Drafts" value={myDrafts.length} color="text-yellow-600" status="drafting" />
        <StatCard label="Revision Required" value={revisionRequired.length} color="text-orange-600" status="revision_required" />
        <StatCard label="Pending Review" value={pending.length} color="text-blue-600" status="ready_for_human_review" />
        <StatCard label="Rejected" value={rejected.length} color="text-red-600" status="failed" />
        <StatCard label="Published" value={published.length} color="text-purple-600" status="published" />
      </div>


      <div className="grid md:grid-cols gap-6">
        <Section
          title="Revision Required"
          count={revisionRequired.length}
          jobs={revisionRequired}
          emptyText="No drafts sent back for revision."
        />
        <Section title="My Drafts" count={myDrafts.length} jobs={myDrafts} emptyText="Nothing waiting on a reviewer." />

      </div>


      <ChartsDashboard
        stats={{
          draft: myDrafts.length + revisionRequired.length,
          approved: mine.filter((j) => j.status === "approved").length,
          published: published.length,
          failed: rejected.length,
        }}
      />
    </>
  );
}

// ==================== TECHNICAL REVIEWER ====================

function ReviewerDashboard({ jobs }) {
  const pending = jobs.filter((j) => j.status === "ready_for_human_review");
  const approved = jobs.filter((j) => j.status === "approved");
  const rejected = jobs.filter((j) => j.status === "failed");
  const history = jobs.filter((j) =>
    ["approved", "published", "failed"].includes(j.status)
  );
  

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Pending Reviews" value={pending.length} color="text-blue-600" status="ready_for_human_review" />
        <StatCard label="Approved" value={approved.length} color="text-green-600" status="approved" />
        <StatCard label="Rejected" value={rejected.length} color="text-red-600" status="failed" />
        <StatCard label="History" value={history.length} color="text-gray-600" />
        
        
      </div>

      <div className="grid md:grid-cols gap-6">
        <Section title="Pending Reviews" count={pending.length} jobs={pending} emptyText="Nothing waiting for review — great job!" />
       
      </div>



      <ChartsDashboard
        stats={{
          draft: jobs.filter((j) => IN_PROGRESS_STATUSES.includes(j.status)).length,
          approved: approved.length,
          published: jobs.filter((j) => j.status === "published").length,
          failed: rejected.length,
        }}
      />
    </>
  );
}

// ==================== DOC LEAD ====================

function DocLeadDashboard({ jobs }) {
  const pending = jobs.filter((j) => j.status === "doc_lead_review"); // NEW: jobs waiting on the doc lead
  const approved = jobs.filter((j) => j.status === "approved");
  const published = jobs.filter((j) => j.status === "published");

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="Pending Reviews" value={pending.length} color="text-blue-600" status="doc_lead_review" />
        <StatCard label="Approved Documents" value={approved.length} color="text-green-600" status="approved" />
        <StatCard label="Publish Queue" value={approved.length} color="text-orange-600" status="approved" />
        <StatCard label="Published History" value={published.length} color="text-purple-600" status="published" />
      </div>

      <div className="grid md:grid-cols gap-6">
        <Section title="Pending Reviews" count={pending.length} jobs={pending} emptyText="Nothing waiting on you — great job!" />
      
      </div>



      <ChartsDashboard
        stats={{
          draft: jobs.filter((j) => IN_PROGRESS_STATUSES.includes(j.status)).length,
          approved: approved.length,
          published: published.length,
          failed: jobs.filter((j) => j.status === "failed").length,
        }}
      />
    </>
  );
}

// ==================== ADMIN ====================

function AdminDashboard({ jobs, metrics, users, logs, onPublish, publishingId }) {
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const byStatus = metrics?.by_status || {};
  const readyToPublish = jobs.filter((j) => j.status === "approved"); // NEW

  return (
    <>
      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        <StatCard label="Total Jobs" value={metrics?.total_jobs || 0} color="text-blue-600" status="all" />
        <StatCard label="Drafting" value={byStatus.drafting || 0} color="text-yellow-600" status="drafting" />
        <StatCard label="Approved" value={byStatus.approved || 0} color="text-green-600" status="approved" />
        <StatCard label="Published" value={byStatus.published || 0} color="text-purple-600" status="published" />
        <StatCard label="Failed" value={byStatus.failed || 0} color="text-red-600" status="failed" />
      </div>


      <ChartsDashboard
        stats={{
          draft: byStatus.drafting || 0,
          approved: byStatus.approved || 0,
          published: byStatus.published || 0,
          failed: byStatus.failed || 0,
        }}
      />

      {/* NEW: Ready to Publish — approved documents, publish directly here */}
      <div className="mt-8">
        <Section
          title="Ready to Publish — action needed"
          count={readyToPublish.length}
          jobs={readyToPublish}
          emptyText="Nothing waiting to be published."
          onPublish={onPublish}
          publishingId={publishingId}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6 mt-8">
        {/* Users */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Users ({users.length})
          </h3>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {users.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No users found.</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.email}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.email}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(u.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!u.is_verified && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                        unverified
                      </span>
                    )}
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      {u.role}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Roles breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Roles</h3>

          <div className="space-y-3">
            {["writer", "technical_reviewer", "doc_lead", "admin"].map((role) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{role.replaceAll("_", " ")}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {roleCounts[role] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Jobs */}
        <Section
          title="All Jobs"
          count={jobs.length}
          jobs={jobs}
          emptyText="No jobs yet."
          onPublish={onPublish}
          publishingId={publishingId}
        />

        {/* Logs */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity ({logs.length})
          </h3>

          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No log entries yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 font-mono text-xs">
              {logs.map((entry, i) => (
                <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <div className="flex justify-between text-gray-400">
                    <span>{entry.event_type}</span>
                    <span>{formatDateTime(entry.timestamp)}</span>
                  </div>
                  {entry.job_id && (
                    <p className="text-gray-600 mt-1">job: {entry.job_id}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}