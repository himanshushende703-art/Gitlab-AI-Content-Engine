"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { FiFileText } from "react-icons/fi";

export default function Navbar({ auth, logout }) {
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);

  const authenticated = !!auth;

  
  const CAN_GENERATE_ROLES = ["writer", "admin"];

  function buildNavLinks() {
    if (!authenticated) {
      return [
        { name: "Home", href: "/" },
        { name: "Features", href: "/#features" },
        { name: "Workflow", href: "/#workflow" },
        { name: "About", href: "/#about" },
      ];
    }

    const links = [{ name: "Dashboard", href: "/dashboard" }];

    if (CAN_GENERATE_ROLES.includes(auth.role)) {
      links.push({ name: "Generate", href: "/generate" });
    }

    links.push({ name: "Drafts", href: "/drafts" });
    links.push({ name: "Workflow", href: "/workflow" });
    // links.push({ name: "GitLab", href: "/gitlab" });
    // links.push({ name: "Analytics", href: "/analytics" });
    // links.push({ name: "Activity", href: "/activity" });

    return links;
  }

  const navLinks = buildNavLinks();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex h-20 items-center justify-between">

          {/* Logo */}

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 shadow-lg shadow-orange-200">
              <FiFileText className="text-white text-xl" />
            </div>

            <div>
              <span className="block text-2xl font-bold text-gray-900">
                Git<span className="text-orange-600">Lab</span> AI
              </span>

              <p className="text-xs text-gray-500">
                Documentation Engine
              </p>
            </div>

          </div>

          {/* Desktop Navigation */}

          <nav className="hidden lg:flex items-center gap-8">

            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`transition font-medium ${
                  pathname === item.href
                    ? "text-orange-600"
                    : "text-gray-700 hover:text-orange-600"
                }`}
              >
                {item.name}
              </Link>
            ))}

          </nav>

          {/* Right Side */}

          <div className="hidden lg:flex items-center gap-4">

            {authenticated ? (
              <>
                <div className="text-right">

                  <p className="font-semibold text-gray-900">
                    {auth.email}
                  </p>

                  <p className="text-xs text-gray-500 capitalize">
                    {auth.role?.replaceAll("_", " ")}
                  </p>

                </div>

                <button
                  onClick={logout}
                  className="rounded-lg bg-orange-500 px-5 py-2 text-white transition hover:bg-orange-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-medium text-gray-700 hover:text-orange-600"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-lg bg-orange-600 px-5 py-2 font-medium text-white transition hover:bg-orange-500"
                >
                  Sign Up
                </Link>
              </>
            )}

          </div>

          {/* Mobile Menu Button */}

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="lg:hidden text-gray-700"
          >
            {mobileMenu ? <X size={28} /> : <Menu size={28} />}
          </button>

        </div>

      </div>

      {/* Mobile Menu */}

      {mobileMenu && (
        <div className="lg:hidden border-t border-gray-200 bg-white">

          <div className="flex flex-col gap-5 p-6">

            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenu(false)}
                className={`font-medium ${
                  pathname === item.href
                    ? "text-orange-600"
                    : "text-gray-700"
                }`}
              >
                {item.name}
              </Link>
            ))}

            {authenticated ? (
              <>
                <div className="border-t border-gray-200 pt-4">

                  <p className="font-semibold text-gray-900">
                    {auth.email}
                  </p>

                  <p className="text-sm text-gray-500 capitalize">
                    {auth.role?.replaceAll("_", " ")}
                  </p>

                </div>

                <button
                  onClick={logout}
                  className="rounded-lg bg-red-600 py-2 text-white hover:bg-red-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-lg bg-orange-600 py-2 text-center text-white hover:bg-orange-500"
                >
                  Sign Up
                </Link>
              </>
            )}

          </div>

        </div>
      )}
    </header>
  );
}