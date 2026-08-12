"use client";

import { useEffect, useState } from "react";
import AnalyticsDashboard from "../../components/analytics/AnalyticDashboard";
import ChartsDashboard from "../../components/analytics/ChartsDashboard";
import Navbar from "../../components/layout/Navbar";



const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

export default function AnalyticsPage() {
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (stored) {
      setAuth(JSON.parse(stored));
    }
  }, []);

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "/login";
  }

  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    published: 0,
    failed: 0,
  });

  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const auth = JSON.parse(
        localStorage.getItem(AUTH_STORAGE_KEY)
      );

      const res = await fetch(`${API_BASE}/api/content-jobs`, {
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();

      setJobs(data);

      setStats({
        total: data.length,
        approved: data.filter((j) => j.status === "approved").length,
        published: data.filter((j) => j.status === "published").length,
        failed: data.filter((j) => j.status === "failed").length,
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <Navbar
        auth={auth}
        logout={logout}
      />

      <div className="max-w-7xl mx-auto px-6 py-10 ">

        <AnalyticsDashboard
          stats={stats}
          jobs={jobs}
        />

      </div>

    </main>
  );
}