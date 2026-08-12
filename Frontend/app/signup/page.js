"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiMail,
  FiLock,
  FiUser,
  FiHome,
  FiArrowRight,
  FiFileText,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

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

        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .join(", ");
  }

  return fallback;
}


function getPasswordChecks(password) {
  return {
    length: password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("writer");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checks = getPasswordChecks(password);
  const isPasswordValid = checks.length && checks.hasLetter && checks.hasNumber;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const showChecklist = password.length > 0;

  async function handleSignup(e) {
    e.preventDefault();

    setError("");

    if (!isPasswordValid) {
      setError("Please meet all password requirements below.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(data, "Signup failed")
        );
      }

      router.push(
        `/verify?email=${encodeURIComponent(email)}`
      );
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-10">

      <div className="grid lg:grid-cols-2 max-w-6xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* LEFT */}

        <div className="hidden lg:flex bg-gradient-to-br from-orange-600 to-orange-500 text-white p-12 flex-col justify-center">

          <div className="flex items-center gap-3 mb-10">

            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <FiFileText size={28} />
            </div>

            <h2 className="text-3xl font-bold">
              GitLab AI
            </h2>

          </div>

          <h1 className="text-5xl font-bold leading-tight">
            Create Your Account
          </h1>

          <p className="mt-6 text-orange-100 text-lg leading-8">
            Join the AI Documentation platform to create,
            manage and publish technical documentation.
          </p>

        </div>

        {/* RIGHT */}

        <div className="p-8 sm:p-12">

          <div className="text-center">

            <h2 className="text-3xl font-bold text-gray-900">
              Sign Up
            </h2>

            <p className="text-gray-500 mt-2">
              Create your GitLab AI account
            </p>

          </div>

          <form
            onSubmit={handleSignup}
            className="mt-8 space-y-5"
          >

            {/* Email */}

            <div>

              <label className="text-sm font-medium text-gray-700">
                Email
              </label>

              <div className="relative mt-2">

                <FiMail className="absolute left-4 top-4 text-gray-400" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-gray-800 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                />

              </div>

            </div>

            {/* Password */}

            <div>

              <label className="text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="relative mt-2">

                <FiLock className="absolute left-4 top-4 text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter password"
                  className={`w-full pl-11 pr-11 py-3 text-gray-800 rounded-xl border outline-none transition ${
                    showChecklist
                      ? isPasswordValid
                        ? "border-green-400 focus:ring-2 focus:ring-green-100"
                        : "border-red-300 focus:ring-2 focus:ring-red-100"
                      : "border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>

              </div>

              {/* Live password checklist */}
              {showChecklist && (
                <ul className="mt-2 space-y-1 text-xs">
                  <li
                    className={`flex items-center gap-1.5 ${
                      checks.length ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {checks.length ? <FiCheckCircle /> : <FiXCircle />}
                    At least 6 characters
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      checks.hasLetter ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {checks.hasLetter ? <FiCheckCircle /> : <FiXCircle />}
                    Contains a letter
                  </li>
                  <li
                    className={`flex items-center gap-1.5 ${
                      checks.hasNumber ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {checks.hasNumber ? <FiCheckCircle /> : <FiXCircle />}
                    Contains a number
                  </li>
                </ul>
              )}

            </div>

            {/* Confirm Password */}

            <div>

              <label className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>

              <div className="relative mt-2">

                <FiLock className="absolute left-4 top-4 text-gray-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Re-enter password"
                  className={`w-full pl-11 pr-4 py-3 text-gray-800 rounded-xl border outline-none transition ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-green-400 focus:ring-2 focus:ring-green-100"
                        : "border-red-300 focus:ring-2 focus:ring-red-100"
                      : "border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  }`}
                />

              </div>

              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500">
                  <FiXCircle /> Passwords do not match
                </p>
              )}

            </div>

            {/* Role */}

            <div>

              <label className="text-sm font-medium text-gray-700">
                Role
              </label>

              <div className="relative mt-2">

                <FiUser className="absolute left-4 top-4 text-gray-400" />

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value)
                  }
                  className="w-full pl-11 text-gray-800 pr-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                >
                  <option value="writer">
                    Writer
                  </option>

                 <option value="technical_reviewer">
                 Technical Reviewer
                 </option>

                  <option value="doc_lead">
                    Documentation Lead
                  </option>

                  <option value="admin">
                    Admin
                  </option>

                </select>

              </div>

            </div>

            {error && (

              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm">
                {error}
              </div>

            )}

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 font-semibold flex justify-center items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}

              {!loading && <FiArrowRight />}
            </button>

          </form>

          <p className="mt-6 text-center text-gray-600">

            Already have an account?{" "}

            <Link
              href="/login"
              className="text-orange-600 font-semibold"
            >
              Login
            </Link>

          </p>

          <Link
            href="/"
            className="mt-6 flex justify-center items-center gap-2 text-gray-500 hover:text-orange-600"
          >
            <FiHome />
            Back to Home
          </Link>

        </div>

      </div>

    </main>
  );
}