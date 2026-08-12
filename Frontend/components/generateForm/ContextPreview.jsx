"use client";

import { useState } from "react";

export default function ContextPreview({
  contextPack,
  job,
  auth,
  onDelete,
  onRegenerate,
  deleting,
  regenerating,
}) {
  const knowledge = contextPack?.retrieved_knowledge || [];
  const repository = contextPack?.repository;

  // NEW: which source cards are expanded (accordion), instead of every
  // card always showing its content in a fixed-height scroll box. Empty
  // set = all collapsed by default.
  const [expandedIndexes, setExpandedIndexes] = useState(() => new Set());

  function toggleExpanded(index) {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const canManage =
    auth && job && (auth.role === "admin" || job.owner_email === auth.email);

  return (
    <section className="mt-10 rounded-2xl border border-gray-200 bg-white shadow-md p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Context Preview
          </h2>
          <p className="text-gray-500 mt-1">
            Review the GitLab source material retrieved for AI documentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            {knowledge.length} Sources
          </div>

          {canManage && (
            <>
              <button
                onClick={onRegenerate}
                disabled={regenerating || deleting}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition disabled:opacity-50"
              >
                {regenerating ? "Refreshing..." : "Regenerate"}
              </button>

              <button
                onClick={onDelete}
                disabled={deleting || regenerating}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-medium transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Job"}
              </button>
            </>
          )}
        </div>
      </div>

      {repository && (
        <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-gray-800">
          <h3 className="text-lg font-semibold text-blue-900">
            GitLab Repository Context
          </h3>

          <p className="mt-4">
            <strong>Repository:</strong>{" "}
            {repository.project?.name || "Unknown"}
          </p>

          <p>
            <strong>Default Branch:</strong>{" "}
            {repository.default_branch || "main"}
          </p>

          <p className="mt-3">
            <strong>Branches:</strong>{" "}
            {repository.branches?.length || 0}
          </p>

          <p>
            <strong>Commits:</strong>{" "}
            {repository.commits?.length || 0}
          </p>

          <p>
            <strong>Merge Requests:</strong>{" "}
            {repository.merge_requests?.length || 0}
          </p>

          <p>
            <strong>Repository Files:</strong>{" "}
            {repository.repository_tree?.length || 0}
          </p>
        </div>
      )}

      {/* Empty State */}
      {knowledge.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <div className="text-5xl mb-4">📂</div>

          <h3 className="text-xl font-semibold text-gray-800">
            No Source Material Found
          </h3>

          <p className="mt-2 text-gray-500">
            Connect a GitLab repository or upload project files to preview
            retrieved context.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {knowledge.map((item, index) => {
            // NEW: accordion instead of a fixed max-h-56 scroll box —
            // content only renders once the card is expanded.
            const isExpanded = expandedIndexes.has(index);

            return (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Header — click to expand/collapse */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(index)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between gap-4 border-b border-gray-100 p-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
                      📄
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {item.source}
                      </h3>

                      <p className="text-sm text-gray-500">
                        GitLab Source Material
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                      {item.category}
                    </span>

                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Content — only shown when expanded, no scroll box */}
                {isExpanded && (
                  <div className="p-6">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                      <p className="whitespace-pre-wrap text-gray-700 leading-7 text-sm">
                        {item.content}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
                      <span>Retrieved from GitLab Repository</span>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 font-medium">
                        Ready for AI
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}