
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import WorkflowTracker from "../../components/workflow/WorkflowTracker";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

const IN_PROGRESS_STATUSES = [
  "intake",
  "context_preparation",
  "drafting",
  "technical_review",
  "tone_optimization",
  "ready_for_human_review",
];

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
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WorkflowPage() {
  const router = useRouter();

  const [auth, setAuth] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      router.push("/login");
      return;
    }

    const authData = JSON.parse(stored);
    setAuth(authData);
    loadData(authData.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(token) {
    setLoading(true);
    setError("");

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const jobsRes = await fetch(`${API_BASE}/api/content-jobs`, { headers });
      if (!jobsRes.ok) throw new Error(`Failed to load jobs (${jobsRes.status})`);
      setJobs(await jobsRes.json());

      const metricsRes = await fetch(`${API_BASE}/api/metrics`, { headers });
      if (metricsRes.ok) setMetrics(await metricsRes.json());
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

  const activeJobs = jobs.filter((j) => IN_PROGRESS_STATUSES.includes(j.status));
  const publishedCount = jobs.filter((j) => j.status === "published").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const totalJobs = metrics?.total_jobs ?? jobs.length;
  const successRate =
    totalJobs > 0 ? Math.round(((publishedCount + (metrics?.by_status?.approved || 0)) / totalJobs) * 100) : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar auth={auth} logout={logout} />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Workflow Dashboard</h1>
            <p className="mt-2 text-gray-600 max-w-3xl">
              Monitor the complete AI-powered documentation lifecycle, from
              source retrieval and content generation to review, approval,
              and final publication.
            </p>
          </div>

          <div className="mt-6 lg:mt-0">
            {/* NEW: only Writer / Admin can generate a new draft — Technical
                Reviewer and Doc Lead are review-only roles. */}
            {(auth?.role === "writer" || auth?.role === "admin") && (
              <Link
                href="/generate"
                className="inline-flex rounded-xl bg-orange-500 px-6 py-3 text-white font-medium hover:bg-orange-600 transition"
              >
                + Generate Documentation
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading workflow data...</p>
        ) : (
          <>
           
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl">⚡</div>
                <p className="mt-4 text-sm text-gray-500">Active Right Now</p>
                <h2 className="mt-2 text-3xl font-bold text-blue-600">{activeJobs.length}</h2>
                <p className="text-sm text-gray-500 mt-2">documents in progress</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl">📄</div>
                <p className="mt-4 text-sm text-gray-500">Total Documents</p>
                <h2 className="mt-2 text-3xl font-bold text-gray-900">{totalJobs}</h2>
                <p className="text-sm text-gray-500 mt-2">all time</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl">✅</div>
                <p className="mt-4 text-sm text-gray-500">Success Rate</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">{successRate}%</h2>
                <p className="text-sm text-gray-500 mt-2">approved + published</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-3xl">⚠️</div>
                <p className="mt-4 text-sm text-gray-500">Failed</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">{failedCount}</h2>
                <p className="text-sm text-gray-500 mt-2">generation or rejection</p>
              </div>

            </div>

         
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8">
              <WorkflowTracker jobs={jobs} />
            </div>

          </>
        )}
      </div>
    </main>
  );
}