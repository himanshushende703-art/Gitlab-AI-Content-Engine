"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiFileText,
  FiCheckCircle,
  FiShield,
  FiZap,
  FiHome,
  FiUserPlus,
  FiAlertCircle,
} from "react-icons/fi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const AUTH_STORAGE_KEY = "gitlab_ace_auth";

function extractErrorMessage(data, fallback) {
  const detail = data?.detail;

  if (!detail) return fallback;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;

        const field = Array.isArray(item.loc)
          ? item.loc[item.loc.length - 1]
          : "";

        return field
          ? `${field}: ${item.msg}`
          : item.msg;
      })
      .join(", ");
  }

  if (typeof detail === "object") {
    return detail.msg || fallback;
  }

  return fallback;
}

// NEW: heuristics to detect a "user does not exist" style error coming from
// the backend, vs. any other login error (wrong password, locked account, etc.)
function isUserNotFoundError(status, message) {
  if (status === 404) return true;

  if (!message) return false;

  const normalized = message.toLowerCase();

  return (
    normalized.includes("not found") ||
    normalized.includes("not registered") ||
    normalized.includes("no account") ||
    normalized.includes("does not exist") ||
    normalized.includes("doesn't exist") ||
    normalized.includes("no user")
  );
}

export default function LoginPage() {
  const router = useRouter();

  // ================= PASSWORD =================

  const [showPassword, setShowPassword] =
    useState(false);

  // ================= FORM =================

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // ================= STATES =================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // NEW: tracks whether the last failed login was because the account
  // doesn't exist yet, so we can show a "please sign up" prompt instead
  // of (or alongside) a plain error message
  const [userNotFound, setUserNotFound] =
    useState(false);

  // ================= HANDLE CHANGE =================

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setUserNotFound(false); // NEW: reset once the user edits the form again
  }

  // ================= LOGIN =================

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setUserNotFound(false);

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        const message = extractErrorMessage(
          data,
          "Login failed"
        );

        // NEW: if the backend is telling us this account doesn't exist,
        // switch to the "sign up first" experience instead of a generic error
        if (isUserNotFoundError(response.status, message)) {
          setUserNotFound(true);
          setError("");
        } else {
          setError(message);
        }

        throw new Error(message);
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: data.token,
          email: data.email,
          role: data.role,
        })
      );

      router.push("/dashboard");
    } catch (err) {
      // error/userNotFound state is already set above for known cases;
      // this keeps the catch harmless for network-level failures too
      if (!userNotFound && !error) {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ================= LEFT SIDE ================= */}

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-600 to-orange-700 text-white">

        {/* Decorative Circles */}

        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full" />

        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-white/10 rounded-full" />

        <div className="absolute top-1/3 right-20 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl" />

        {/* Content */}

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 max-w-3xl">

          {/* Logo */}

          <Link
            href="/"
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
              <FiFileText
                size={25}
                className="text-white"
              />
            </div>

            <span className="text-2xl font-bold">
              Git
              <span className="text-orange-200">
                Lab
              </span>
            </span>

          </Link>

          {/* Badge */}

          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2 rounded-full w-fit text-sm">

            <FiZap />

            AI Powered Documentation

          </div>

          {/* Heading */}

          <h1 className="text-5xl xl:text-6xl font-bold leading-tight mt-7">

            AI Content &

            <br />

            <span className="text-orange-100">
              Documentation Engine
            </span>

          </h1>

          {/* Description */}

          <p className="mt-7 text-lg text-orange-100 leading-8 max-w-xl">

            Generate release notes, API documentation,
            technical blogs and onboarding guides
            with powerful AI-driven workflows.

          </p>

          {/* Features */}

          <div className="mt-10 space-y-5">

            <Feature
              icon={<FiCheckCircle />}
              text="AI Generated Documentation"
            />

            <Feature
              icon={<FiZap />}
              text="Multi-Agent Workflow"
            />

            <Feature
              icon={<FiShield />}
              text="Secure Team Collaboration"
            />

          </div>

          {/* Bottom Text */}

          <p className="mt-12 text-sm text-orange-200">

            Create smarter documentation.
            Work faster with AI.

          </p>

        </div>

      </div>

      {/* ================= RIGHT SIDE ================= */}

      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-br from-gray-50 to-orange-50">

        <div className="w-full max-w-md">

          {/* Mobile Logo */}

          <div className="lg:hidden flex justify-center mb-8">

            <Link
              href="/"
              className="flex items-center gap-2"
            >

              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">

                <FiFileText
                  className="text-white"
                  size={22}
                />

              </div>

              <span className="text-2xl font-bold">

                Git
                <span className="text-orange-600">
                  Lab
                </span>

              </span>

            </Link>

          </div>
          {/* Login Card */}

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 sm:p-10">

            {/* Header */}

            <div className="text-center">

              <div className="mx-auto w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <FiFileText size={26} />
              </div>

              <h2 className="text-3xl font-bold mt-6 text-gray-900">
                Welcome Back 👋
              </h2>

              <p className="text-gray-500 mt-2">
                Login to continue to your account
              </p>

            </div>

            {/* Login Form */}

            <form
              onSubmit={handleLogin}
              className="mt-8 space-y-5"
            >

              {/* Email */}

              <div>

                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />

              </div>

              {/* Password */}

              <div>

                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pr-12 text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
                  >

                    {showPassword ? (
                      <FiEyeOff size={20} />
                    ) : (
                      <FiEye size={20} />
                    )}

                  </button>

                </div>

              </div>

              {/* Error (wrong password / other login errors — NOT shown when userNotFound) */}

              {error && !userNotFound && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                  <FiAlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Login Button */}

              <button
                type="submit"
                disabled={loading}
                className="group w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg shadow-orange-200 transition-all duration-300 hover:-translate-y-0.5"
              >

                {loading ? "Signing In..." : "Login"}

                {!loading && (
                  <FiArrowRight
                    className="group-hover:translate-x-1 transition"
                    size={20}
                  />
                )}

              </button>

            </form>

            {/* Divider */}

            <div className="flex items-center gap-4 my-7">

              <div className="flex-1 h-px bg-gray-200" />

              <span className="text-xs text-gray-400 font-medium">
                OR
              </span>

              <div className="flex-1 h-px bg-gray-200" />

            </div>

            {/* Signup */}

            <p className="text-center text-gray-600">

              Don't have an account?{" "}

              <Link
                href="/signup"
                className="text-orange-600 font-semibold hover:text-orange-700 hover:underline"
              >
                Sign Up
              </Link>

            </p>

            {/* Back Home */}

            <Link
              href="/"
              className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition"
            >

              <FiHome size={16} />

              Back to Home

            </Link>

          </div>

          {/* Footer */}

          <p className="text-center text-xs text-gray-400 mt-6">

            © 2026 GitLab. All rights reserved.

          </p>

        </div>

      </div>

      {/* NEW: "Account not found" pop-up — shown as a modal overlay
          instead of an inline banner, so it's impossible to miss. */}
      {userNotFound && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setUserNotFound(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FiUserPlus size={26} />
            </div>

            <h3 className="mt-5 text-xl font-bold text-gray-900 text-center">
              We couldn't find an account
            </h3>
            <p className="mt-2 text-sm text-gray-600 text-center">
              There's no account associated with{" "}
              <span className="font-medium text-gray-800">
                {formData.email}
              </span>
              . Please create an account first.
            </p>

            <Link
              href={{
                pathname: "/signup",
                query: { email: formData.email },
              }}
              className="mt-6 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-sm shadow-orange-200 transition"
            >
              Create an account
              <FiArrowRight size={16} />
            </Link>

            <button
              type="button"
              onClick={() => setUserNotFound(false)}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              Try a different email
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

/* ================= FEATURE COMPONENT ================= */

function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-4">

      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-orange-100">
        {icon}
      </div>

      <span className="text-orange-50 font-medium">
        {text}
      </span>

    </div>
  );
}