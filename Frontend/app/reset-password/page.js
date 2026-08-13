"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiArrowLeft,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiFileText,
  FiHome,
} from "react-icons/fi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Token received from:
  // http://localhost:3000/reset-password?token=xxxxx
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    // Check reset token
    if (!token) {
      setError(
        "Invalid or missing reset link. Please request a new password reset link."
      );
      return;
    }

    // Password validation
    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.detail ||
            "Unable to reset password. Please try again."
        );
        return;
      }

      setMessage(
        "Password reset successfully! Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      setError(
        "Could not reach the server. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* =====================================================
          LEFT SIDE
      ====================================================== */}

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
              <FiFileText size={25} />
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
            <FiShield />
            Secure Account Recovery
          </div>

          {/* Heading */}

          <h1 className="text-5xl xl:text-6xl font-bold leading-tight mt-7">
            Reset Your
            <br />

            <span className="text-orange-100">
              Password
            </span>
          </h1>

          {/* Description */}

          <p className="mt-7 text-lg text-orange-100 leading-8 max-w-xl">
            Create a new password and securely regain
            access to your GitLab AI Content & Documentation
            Engine account.
          </p>

          {/* Features */}

          <div className="mt-10 space-y-5">

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <FiLock />
              </div>

              <span className="text-orange-50 font-medium">
                Create a strong password
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <FiShield />
              </div>

              <span className="text-orange-50 font-medium">
                Keep your account secure
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <FiCheckCircle />
              </div>

              <span className="text-orange-50 font-medium">
                Continue securely after reset
              </span>
            </div>

          </div>

          <p className="mt-12 text-sm text-orange-200">
            Your account security matters to us.
          </p>

        </div>
      </div>

      {/* =====================================================
          RIGHT SIDE
      ====================================================== */}

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

          {/* Reset Password Card */}

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 sm:p-10">

            {/* Header */}

            <div className="text-center">

              <div className="mx-auto w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <FiLock size={26} />
              </div>

              <h2 className="text-3xl font-bold mt-6 text-gray-900">
                Reset Password
              </h2>

              <p className="text-gray-500 mt-2 leading-6">
                Enter your new password below to secure
                your account.
              </p>

            </div>

            {/* Form */}

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >

              {/* New Password */}

              <div>

                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-semibold text-gray-700"
                >
                  New Password
                </label>

                <div className="relative">

                  <FiLock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={19}
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                      setMessage("");
                    }}
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FiEyeOff size={20} />
                    ) : (
                      <FiEye size={20} />
                    )}
                  </button>

                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Use at least 6 characters.
                </p>

              </div>

              {/* Confirm Password */}

              <div>

                <label
                  htmlFor="confirmPassword"
                  className="block mb-2 text-sm font-semibold text-gray-700"
                >
                  Confirm Password
                </label>

                <div className="relative">

                  <FiLock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={19}
                  />

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                      setMessage("");
                    }}
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-11 pr-12 py-3.5 text-gray-900 placeholder-gray-400 outline-none transition focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff size={20} />
                    ) : (
                      <FiEye size={20} />
                    )}
                  </button>

                </div>

              </div>

              {/* Error */}

              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">

                  <FiAlertCircle
                    className="mt-0.5 flex-shrink-0"
                    size={18}
                  />

                  <span>{error}</span>

                </div>
              )}

              {/* Success */}

              {message && (
                <div className="flex items-start gap-3 p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">

                  <FiCheckCircle
                    className="mt-0.5 flex-shrink-0"
                    size={18}
                  />

                  <span>{message}</span>

                </div>
              )}

              {/* Reset Button */}

              <button
                type="submit"
                disabled={loading}
                className="group w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 shadow-lg shadow-orange-200 transition-all duration-300 hover:-translate-y-0.5"
              >

                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password

                    <FiArrowRight
                      className="group-hover:translate-x-1 transition"
                      size={20}
                    />
                  </>
                )}

              </button>

            </form>

            {/* Back to Login */}

            <Link
              href="/login"
              className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition"
            >
              <FiArrowLeft size={16} />
              Back to Login
            </Link>

            {/* Back Home */}

            <Link
              href="/"
              className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-orange-600 transition"
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

    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}