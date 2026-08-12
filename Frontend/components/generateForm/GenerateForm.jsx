"use client";

import { useState } from "react";
import {
  FiFileText,
  FiUpload,
  FiEdit3,
  FiUsers,
  FiTarget,
  FiType,
  FiZap,
  FiLock,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";

export default function GenerateForm({
  handleGenerate,
  loading,
  contentType,
  setContentType,
  audience,
  setAudience,
  targetChannel,
  setTargetChannel,
  titleHint,
  setTitleHint,
  sourceText,
  setSourceText,
  uploadedFile,
  setUploadedFile,
  gitlabProjectId,
  setGitlabProjectId,
  selectedOption,
  setSelectedOption,
  CONTENT_TYPES,
}) {



  const sourceLength = sourceText?.length || 0;
  const sourceValid = sourceLength >= 10;

  const SOURCE_OPTIONS = [
    { key: "upload", label: "Upload PDF / DOCX", icon: FiUpload, disabled: false },
    { key: "gitlab", label: "GitLab Repository", icon: FiTarget, disabled: false },
    { key: "manual", label: "Type Manually", icon: FiEdit3, disabled: false },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

      {/* ================= MAIN FORM ================= */}
      <section className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">

        <div className="relative bg-gradient-to-r from-orange-600 to-red-500 px-8 py-8 text-white overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-16 h-32 w-32 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <FiZap size={28} />
            </div>

            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Generate Documentation
              </h2>
              <p className="mt-1 text-orange-50">
                Step 1 of 3 — Provide the details, we'll handle the rest.
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="relative mt-6 flex items-center gap-2 text-sm font-medium text-orange-50">
            <span className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-orange-600 text-xs font-bold">1</span>
              Details
            </span>
            <span className="h-px w-8 bg-white/30" />
            <span className="flex items-center gap-2 rounded-full px-3 py-1 opacity-70">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-white text-xs font-bold">2</span>
              Preview
            </span>
            <span className="h-px w-8 bg-white/30" />
            <span className="flex items-center gap-2 rounded-full px-3 py-1 opacity-70">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-white text-xs font-bold">3</span>
              Generate
            </span>
          </div>
        </div>

        <div className="p-8 space-y-9">

          {/* Source Selection */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Source — choose one
            </h3>
            <div className="mb-4">
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FiFileText className="text-orange-500" />
                      Content Type
                    </label>

                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full rounded-xl text-gray-800 border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    >
                      {CONTENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>


            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {SOURCE_OPTIONS.map(({ key, label, icon: Icon, disabled }) => (
                <label
                  key={key}
                  title={disabled ? "GitLab repository integration is not available yet" : undefined}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition ${disabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-70"
                    : "cursor-pointer " +
                    (selectedOption === key
                      ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100"
                      : "border-gray-300 bg-white hover:border-orange-300")
                    }`}
                >
                  <input
                    type="radio"
                    name="source"
                    disabled={disabled}
                    checked={selectedOption === key}
                    onChange={() => setSelectedOption(key)}
                    className={disabled ? "accent-gray-400" : "accent-orange-500"}
                  />
                  <Icon className={disabled ? "text-gray-400" : "text-orange-500"} />
                  <span className={`font-semibold ${disabled ? "text-gray-500" : "text-gray-700"}`}>
                    {label}
                  </span>

                  {disabled && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      <FiLock size={10} />
                      Soon
                    </span>
                  )}
                </label>
              ))}
            </div>

            {/* Upload Section */}
            {selectedOption === "upload" && (
              <div className="mt-4">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadedFile(e.target.files[0])}
                  className="w-full rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-4 text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-orange-700 transition"
                />

                {uploadedFile && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-green-600">
                    <FiCheckCircle /> Selected: {uploadedFile.name}
                  </p>
                )}

              </div>
            )}

            {/* GitLab Section */}
            {selectedOption === "gitlab" && (
              <div className="mt-4 space-y-5">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    GitLab Project ID
                  </label>

                  <input
                    type="number"
                    value={gitlabProjectId}
                    onChange={(e) => setGitlabProjectId(e.target.value)}
                    placeholder="Enter Your Project ID"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-sm text-orange-700">
                    Enter the GitLab Project ID. AI will retrieve repository context and
                    generate documentation directly from your repository.
                  </p>
                </div>

              </div>
            )}
          </div>

          <form onSubmit={handleGenerate} className="space-y-9">


            {selectedOption === "manual" && (
              <div>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Document Details
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                  
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FiUsers className="text-orange-500" />
                      Audience
                    </label>

                    <input
                      type="text"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="Developers"
                      className="w-full rounded-xl text-gray-800 border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FiTarget className="text-orange-500" />
                      Target Channel
                    </label>

                    <input
                      type="text"
                      value={targetChannel}
                      onChange={(e) => setTargetChannel(e.target.value)}
                      placeholder="Changelog"
                      className="w-full rounded-xl text-gray-800 border border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <FiType className="text-orange-500" />
                      Title Hint <span className="font-normal text-gray-400">(optional)</span>
                    </label>

                    <input
                      type="text"
                      value={titleHint}
                      onChange={(e) => setTitleHint(e.target.value)}
                      placeholder="Optional title"
                      className="w-full rounded-xl border text-gray-800 border-gray-300 bg-gray-50 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>
              </div>
            )}


            {selectedOption === "manual" && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <FiEdit3 className="text-orange-500" />
                    Source Material
                  </label>

                  <span
                    className={`text-xs font-medium ${sourceValid ? "text-green-600" : "text-gray-400"
                      }`}
                  >
                    {sourceValid && <FiCheckCircle className="inline mb-0.5 mr-1" />}
                    {sourceLength} characters {sourceValid ? "" : "(min. 10)"}
                  </span>
                </div>

                <textarea
                  rows={10}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste release notes, API details, meeting notes or any source material..."
                  className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />

                <p className="mt-2 text-xs text-gray-400">
                  This is the main content the AI reads to generate your draft
                  — the richer it is, the better the result.
                </p>
              </div>
            )}

            {selectedOption === "upload" && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                Using the uploaded file as source. Switch to{" "}
                <button
                  type="button"
                  onClick={() => setSelectedOption("manual")}
                  className="font-semibold text-orange-600 hover:underline"
                >
                  Type Manually
                </button>{" "}
                any time to paste exact text instead.
              </div>
            )}

            {/* Generate Button */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-400 hidden sm:block">
                You'll review the retrieved context before anything is generated.
              </p>

              <button
                type="submit"
                disabled={loading || (selectedOption === "manual" && !sourceValid)}
                className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 px-8 py-3 font-semibold text-white shadow-lg shadow-orange-200 transition hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
              >
                <FiZap />
                {loading ? "Creating job..." : "Continue to Preview"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ================= SIDEBAR ================= */}
      <aside className="space-y-6 lg:sticky lg:top-8">

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6">
          <h4 className="flex items-center gap-2 font-semibold text-orange-700">
            <FiInfo /> How this works
          </h4>

          <ol className="mt-4 space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">1</span>
              Fill in the details and source material on this page.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">2</span>
              We retrieve relevant GitLab knowledge and show you a preview.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">3</span>
              You confirm, and the AI agents write your draft.
            </li>
          </ol>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h4 className="font-semibold text-gray-800">Good source material includes</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>• Release notes or changelog entries</li>
            <li>• API request / response examples</li>
            <li>• Meeting notes or design decisions</li>
            <li>• Existing docs you want rewritten</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}