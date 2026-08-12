"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import GenerateForm from "../../components/generateForm/GenerateForm";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

const CONTENT_TYPES = [
  "release_notes",
  "documentation",
  "blog",
  "api_reference",
  "onboarding_guide",
];


const CAN_GENERATE_ROLES = ["writer", "admin"];

export default function GeneratePage() {
  const router = useRouter();

  const [auth, setAuth] = useState(null);

  const [contentType, setContentType] = useState("release_notes");
  const [audience, setAudience] = useState("developers");
  const [targetChannel, setTargetChannel] = useState("changelog");
  const [titleHint, setTitleHint] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [gitlabProjectId, setGitlabProjectId] = useState("");
  const [selectedOption, setSelectedOption] = useState("manual");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = localStorage.getItem(AUTH_STORAGE_KEY);

    if (user) {
      setAuth(JSON.parse(user));
    }
  }, []);

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  const canGenerate = auth && CAN_GENERATE_ROLES.includes(auth.role);

  async function handleGenerate(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const authData = JSON.parse(
        localStorage.getItem(AUTH_STORAGE_KEY)
      );

      if (!authData) {
        setError("Please login first.");
        return;
      }

      if (!CAN_GENERATE_ROLES.includes(authData.role)) {
        setError(
          `Your role ("${authData.role}") is not allowed to generate drafts. Only writer or admin can.`
        );
        return;
      }

      if (
  selectedOption === "gitlab" &&
  !gitlabProjectId.trim()
) {
  throw new Error("Please enter GitLab Project ID.");
}

      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const uploadRes = await fetch(`${API_BASE}/api/upload-document`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("File upload failed.");
        }
      }

      const res = await fetch(`${API_BASE}/api/content-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData.token}`,
        },
        body: JSON.stringify({
  content_type: contentType,
  audience,
  target_channel: targetChannel,
  title_hint: titleHint || null,

  source_text:
    selectedOption === "manual"
      ? sourceText
      : selectedOption === "gitlab"
      ? "Generate documentation from GitLab repository."
      : "Document uploaded",

  gitlab_project_id:
    selectedOption === "gitlab"
      ? Number(gitlabProjectId)
      : null,
}),
      });

      const job = await res.json();

      if (!res.ok) {
        throw new Error(job.detail || "Failed to create job.");
      }

      router.push(`/generate/preview/${job.job_id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">

      <Navbar
        auth={auth}
        logout={logout}
      />

      <div className="max-w-6xl mx-auto px-6 py-10">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-800">
            Generate Documentation
          </h1>

          <p className="text-gray-500 mt-2">
            Create AI-powered GitLab documentation using the Content &
            Documentation Engine.
          </p>
        </div>

        {auth && !canGenerate && (
          <div className="mb-6 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
            Your role (<strong>{auth.role}</strong>) cannot generate drafts.
            Only <strong>writer</strong> or <strong>admin</strong> accounts can.
          </div>
        )}

        <GenerateForm
          handleGenerate={handleGenerate}
          loading={loading}
          contentType={contentType}
          setContentType={setContentType}
          audience={audience}
          setAudience={setAudience}
          targetChannel={targetChannel}
          setTargetChannel={setTargetChannel}
          titleHint={titleHint}
          setTitleHint={setTitleHint}
          sourceText={sourceText}
          setSourceText={setSourceText}
          uploadedFile={uploadedFile}
          setUploadedFile={setUploadedFile}
          gitlabProjectId={gitlabProjectId}
          setGitlabProjectId={setGitlabProjectId}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
          CONTENT_TYPES={CONTENT_TYPES}
        />

        {error && (
          <div className="mt-6 bg-red-50 border border-red-300 rounded-xl p-4 text-red-700">
            {error}
          </div>
        )}

      </div>

    </main>
  );
}