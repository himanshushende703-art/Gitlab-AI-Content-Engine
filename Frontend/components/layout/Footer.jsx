"use client";

import Link from "next/link";
import { FiFileText } from "react-icons/fi";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-10">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex flex-col md:flex-row justify-between items-center gap-5">

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg">
              <FiFileText className="text-white text-xl" />
            </div>

            <span className="text-2xl font-bold text-white">
              Git
              <span className="text-orange-600">
                Lab
              </span>
            </span>
          </Link>

          {/* Copyright */}
          <p className="text-sm text-center">
            © {new Date().getFullYear()} GitLab AI Content & Documentation Engine.
            All Rights Reserved.
          </p>

        </div>

      </div>
    </footer>
  );
}