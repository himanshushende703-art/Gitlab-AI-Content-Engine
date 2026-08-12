"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiFileText, FiClock, FiUser, FiTag } from "react-icons/fi";

import Navbar from "../../../components/layout/Navbar";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

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

// NEW: small, dependency-free Markdown -> JSX renderer. The backend only
// ever produces a predictable subset of Markdown (#/##/### headings, "- "
// bullet lists, **bold**, blank-line-separated paragraphs), so a full
// Markdown library isn't needed just to display it nicely.
function renderMarkdown(markdown) {
  if (!markdown) return null;

  const lines = markdown.split("\n");
  const blocks = [];
  let listBuffer = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="list-disc pl-6 space-y-2 text-gray-700"
      >
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function renderInline(text) {
    // **bold** -> <strong>
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (line.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={idx} className="text-xl font-bold text-gray-900 mt-8 mb-3">
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={idx} className="text-2xl font-bold text-gray-900 mt-10 mb-4">
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      // The job's own title is already shown in the page header, so a
      // leading "# Title" line inside the content is skipped here to
      // avoid showing the title twice.
      return;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuffer.push(line.slice(2));
    } else if (line === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={idx} className="text-gray-700 leading-8 mt-4">
          {renderInline(line)}
        </p>
      );
    }
  });

  flushList();
  return blocks;
}

export default function PublishedViewerPage({ params }) {
  const jobId = params.job_id;

  const [auth, setAuth] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) setAuth(JSON.parse(stored));

    async function loadJob() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/content-jobs/${jobId}`);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Could not load document (${res.status})`);
        }

        const data = await res.json();
        setJob(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar auth={auth} />

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link
          href="/documents/published"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition mb-6"
        >
          <FiArrowLeft size={16} />
          Back to Published Documents
        </Link>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-400">
            Loading document...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && job && job.status !== "published" && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-10 text-center text-yellow-700">
            This document is not published yet (current status:{" "}
            <span className="font-semibold">{job.status}</span>).
          </div>
        )}

        {!loading && !error && job && job.status === "published" && (
          <article className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-100 p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 text-purple-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <FiFileText size={14} />
                Published
              </div>

              <h1 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                {job.draft_title || "Untitled Document"}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <FiUser size={14} />
                  {job.owner_email || "Unknown author"}
                </span>

                <span className="flex items-center gap-1.5">
                  <FiClock size={14} />
                  Updated {formatDateTime(job.updated_at)}
                </span>

                <span className="flex items-center gap-1.5">
                  <FiTag size={14} />
                  {job.content_type} • {job.audience}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 sm:p-10">
              {renderMarkdown(job.draft_content)}
            </div>

            {/* Source references */}
            {job.source_references && job.source_references.length > 0 && (
              <div className="border-t border-gray-100 p-8 sm:p-10">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Sources
                </h4>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-500 list-disc pl-5">
                  {job.source_references.map((ref, i) => (
                    <li key={i}>{ref}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        )}
      </div>
    </main>
  );
}