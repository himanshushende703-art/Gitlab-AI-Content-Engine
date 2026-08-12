"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Navbar from "../../../../components/layout/Navbar";
import ContextPreview from "../../../../components/generateForm/ContextPreview";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

export default function GeneratePreviewPage({ params }) {
  const router = useRouter();
  const jobId = params.id;

  const [auth, setAuth] = useState(null);
  const [job, setJob] = useState(null);
  const [contextPack, setContextPack] = useState(null);

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingContext, setLoadingContext] = useState(true);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [regeneratingContext, setRegeneratingContext] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      router.push("/login");
      return;
    }

    const authData = JSON.parse(stored);
    setAuth(authData);

    loadJob(authData.token);
    loadContextPack(authData.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function loadJob(token) {
    setLoadingJob(true);

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load job (${res.status})`);
      }

      const data = await res.json();
      setJob(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingJob(false);
    }
  }

  // --- Context preview ---
  async function loadContextPack(token) {
    setLoadingContext(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/context-pack?job_id=${jobId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to load context preview (${res.status})`);
      }

      const data = await res.json();
      setContextPack(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingContext(false);
    }
  }

  // --- Regenerate context preview ---
  async function handleRegenerateContext() {
    setRegeneratingContext(true);
    setError("");

    try {
      await loadContextPack(auth.token);
    } finally {
      setRegeneratingContext(false);
    }
  }

  // --- Job delete  ---
  async function handleDeleteJob() {
    if (!window.confirm("Are you sure you want to delete this job? This cannot be undone.")) {
      return;
    }

    setDeletingJob(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/content-jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to delete job (${res.status})`);
      }

      router.push("/generate");
    } catch (err) {
      setError(err.message);
      setDeletingJob(false);
    }
  }

  // ---  AI agent workflow ---
  async function handleRunWorkflow() {
    setGeneratingDraft(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `${API_BASE}/api/agent-workflow/run?job_id=${jobId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      const updatedJob = await res.json();

      if (!res.ok) {
        throw new Error(updatedJob.detail || "AI generation failed.");
      }

      setSuccess("Draft generated successfully! Opening document...");

      const generatedId = updatedJob?.job_id || jobId;

      setTimeout(() => {
        router.push(`/drafts/${generatedId}`);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingDraft(false);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar auth={auth} logout={logout} />

      <div className="max-w-6xl mx-auto px-6 py-10">

        <Link
          href="/generate"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition mb-6"
        >
          ← Back to Generate
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            {loadingJob
              ? "Loading job..."
              : job?.title_hint || job?.content_type?.replaceAll("_", " ") || "Context Preview"}
          </h1>
          <p className="text-gray-500 mt-2">
            Review the retrieved source material, then confirm to run the AI
            generation.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-300 bg-green-50 p-4 text-green-700">
            {success}
          </div>
        )}

        {loadingContext ? (
          <p className="text-gray-500">Loading context preview...</p>
        ) : (
          contextPack && (
            <>
              <ContextPreview
                contextPack={contextPack}
                job={job}
                auth={auth}
                onDelete={handleDeleteJob}
                onRegenerate={handleRegenerateContext}
                deleting={deletingJob}
                regenerating={regeneratingContext}
              />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleRunWorkflow}
                  disabled={generatingDraft}
                  className="inline-flex items-center gap-3 rounded-xl bg-green-600 hover:bg-green-700 text-white px-8 py-3 font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingDraft
                    ? "Running AI agents... (this can take up to a minute)"
                    : "Confirm & Generate Draft with AI"}
                </button>
              </div>
            </>
          )
        )}

      </div>
    </main>
  );
}