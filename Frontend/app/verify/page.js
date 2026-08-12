"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  FiMail,
  FiArrowLeft,
} from "react-icons/fi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://127.0.0.1:8000";

function extractErrorMessage(data, fallback) {
  const detail = data?.detail;

  if (!detail) return fallback;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const field = Array.isArray(item.loc)
          ? item.loc[item.loc.length - 1]
          : "";

        return field
          ? `${field}: ${item.msg}`
          : item.msg;
      })
      .join(", ");
  }

  return fallback;
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e) {
    e.preventDefault();

    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Verification code must be 6 digits."
      );
      return;
    }

    if (!email) {
      setError(
        "Email address is missing. Please go back and try again."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/auth/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          extractErrorMessage(
            data,
            "Verification failed"
          )
        );
      }

      router.push("/login?verified=true");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 px-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Verify Email
        </h1>

        {/* Email */}
        <div className="flex justify-center items-center gap-2 mt-4 text-orange-600 font-semibold break-all text-center">
          <FiMail className="shrink-0" />
          <span>{email || "Email address"}</span>
        </div>

        {/* Form */}
        <form
          onSubmit={handleVerify}
          className="space-y-6 mt-8"
        >

          {/* Verification Code */}
          <div>
            <label
              htmlFor="verification-code"
              className="block mb-2 text-sm font-semibold text-gray-700"
            >
              Verification Code
            </label>

            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => {
                const value =
                  e.target.value.replace(/\D/g, "");

                setCode(value);
                setError("");
              }}
              placeholder="123456"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-[10px] text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Verifying..."
              : "Verify Email"}
          </button>
        </form>

        {/* Back to Login */}
        <Link
          href="/login"
          className="mt-6 flex justify-center items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition"
        >
          <FiArrowLeft />
          Back to Login
        </Link>
      </div>
    </main>
  );
}

/*
 * IMPORTANT:
 * useSearchParams() requires a Suspense boundary
 * during Next.js production build/prerendering.
 */
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100 px-6">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-600">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}