
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/layout/Navbar";
import {
  FiGitBranch,
  FiFolder,
  FiFile,
  FiGitCommit,
  FiGitPullRequest,
  FiArrowLeft,
  FiExternalLink,
} from "react-icons/fi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

const TABS = [
  { key: "tree", label: "Files", icon: FiFolder },
  { key: "branches", label: "Branches", icon: FiGitBranch },
  { key: "commits", label: "Commits", icon: FiGitCommit },
  { key: "merge_requests", label: "Merge Requests", icon: FiGitPullRequest },
];

export default function GitLabPage() {
  const router = useRouter();

  const [auth, setAuth] = useState(null);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("tree");

  const [tabData, setTabData] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [tabError, setTabError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!stored) {
      router.push("/login");
      return;
    }

    const authData = JSON.parse(stored);
    setAuth(authData);

    loadProjects(authData.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProjects(token) {
    setLoadingProjects(true);
    setProjectsError("");

    try {
      const res = await fetch(`${API_BASE}/api/gitlab/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.detail ||
            "Failed to load GitLab projects. Check GITLAB_URL / GITLAB_TOKEN in the backend .env."
        );
      }

      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setProjectsError(err.message);
    } finally {
      setLoadingProjects(false);
    }
  }

  function openProject(project) {
    setSelectedProject(project);
    setActiveTab("tree");
    setTabData({});
    loadTab(project.id, "tree");
  }

  async function loadTab(projectId, tabKey) {
    setLoadingTab(true);
    setTabError("");

    try {
      const endpointMap = {
        tree: `tree`,
        branches: `branches`,
        commits: `commits`,
        merge_requests: `merge-requests`,
      };

      const res = await fetch(
        `${API_BASE}/api/gitlab/projects/${projectId}/${endpointMap[tabKey]}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to load ${tabKey} (${res.status})`);
      }

      const data = await res.json();
      setTabData((prev) => ({ ...prev, [tabKey]: data }));
    } catch (err) {
      setTabError(err.message);
    } finally {
      setLoadingTab(false);
    }
  }

  function switchTab(tabKey) {
    setActiveTab(tabKey);
    if (!tabData[tabKey]) {
      loadTab(selectedProject.id, tabKey);
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar auth={auth} logout={logout} />

      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">GitLab Repositories</h1>
          <p className="text-gray-500 mt-2">
            Browse your connected GitLab projects — files, branches, commits and merge requests.
          </p>
        </div>

        {!selectedProject ? (
          <>
            {projectsError && (
              <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
                {projectsError}
              </div>
            )}

            {loadingProjects ? (
              <p className="text-gray-500">Loading projects...</p>
            ) : projects.length === 0 && !projectsError ? (
              <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center bg-white">
                <div className="text-5xl mb-4">🦊</div>
                <h3 className="text-xl font-semibold text-gray-800">No GitLab projects found</h3>
                <p className="mt-2 text-gray-500">
                  Make sure GITLAB_URL and GITLAB_TOKEN are set correctly in the backend.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openProject(p)}
                    className="text-left rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-orange-300 transition"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {p.name_with_namespace || p.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {p.description || "No description"}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <FiGitBranch size={12} />
                      {p.default_branch || "main"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setSelectedProject(null)}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-600 transition"
            >
              <FiArrowLeft /> Back to projects
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedProject.name_with_namespace || selectedProject.name}
                </h2>

                {selectedProject.web_url && (
                  <a
                    href={selectedProject.web_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                  >
                    Open in GitLab <FiExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Tabs */}
              <div className="mt-5 flex gap-2 border-b border-gray-100">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => switchTab(key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                      activeTab === key
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {tabError && (
              <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
                {tabError}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              {loadingTab ? (
                <p className="text-gray-500">Loading {activeTab}...</p>
              ) : (
                <>
                  {activeTab === "tree" && <FileTree items={tabData.tree || []} />}
                  {activeTab === "branches" && <BranchList items={tabData.branches || []} />}
                  {activeTab === "commits" && <CommitList items={tabData.commits || []} />}
                  {activeTab === "merge_requests" && (
                    <MergeRequestList items={tabData.merge_requests || []} />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function FileTree({ items }) {
  if (items.length === 0) return <p className="text-gray-400 text-sm py-6 text-center">No files found.</p>;

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {items.map((item) => (
        <div key={item.id || item.path} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 text-sm">
          {item.type === "tree" ? <FiFolder className="text-orange-400" /> : <FiFile className="text-gray-400" />}
          <span className="text-gray-700">{item.path || item.name}</span>
        </div>
      ))}
    </div>
  );
}

function BranchList({ items }) {
  if (items.length === 0) return <p className="text-gray-400 text-sm py-6 text-center">No branches found.</p>;

  return (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b.name} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <FiGitBranch className="text-orange-500" /> {b.name}
          </span>
          {b.default && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">default</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CommitList({ items }) {
  if (items.length === 0) return <p className="text-gray-400 text-sm py-6 text-center">No commits found.</p>;

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {items.map((c) => (
        <div key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-sm font-medium text-gray-800">{c.title}</p>
          <p className="text-xs text-gray-400 mt-1">
            {c.author_name} • {c.short_id}
          </p>
        </div>
      ))}
    </div>
  );
}

function MergeRequestList({ items }) {
  if (items.length === 0) return <p className="text-gray-400 text-sm py-6 text-center">No merge requests found.</p>;

  const stateBadge = { opened: "bg-green-100 text-green-700", merged: "bg-purple-100 text-purple-700", closed: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-3">
      {items.map((mr) => (
        <div key={mr.iid} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">!{mr.iid} {mr.title}</p>
            <p className="text-xs text-gray-400 mt-1">{mr.author?.name}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${stateBadge[mr.state] || "bg-gray-100 text-gray-600"}`}>
            {mr.state}
          </span>
        </div>
      ))}
    </div>
  );
} 