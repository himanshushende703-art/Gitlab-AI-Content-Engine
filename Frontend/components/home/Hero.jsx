"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  CheckCircle,
} from "lucide-react";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden pt-32 pb-24 bg-gradient-to-br from-orange-50 via-white to-orange-100"
    >
      {/* Background Blur Effects */}

      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT */}

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >

            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-700 shadow-sm">
              <Zap size={18} />
              AI Powered Documentation
            </div>

            <h1 className="mt-7 text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-gray-900">
              Create
              <span className="text-orange-600">
                {" "}Documentation
              </span>

              <br />

              <span>
                10x Faster
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-gray-600">
              Build beautiful, accurate and professional documentation
              using AI-powered workflows. Generate technical documents,
              release notes, blogs, onboarding guides and API
              documentation faster than ever.
            </p>

            {/* Buttons */}

            <div className="mt-10 flex flex-wrap gap-4">

              <Link
                href="/signup"
                className="group flex items-center gap-3 rounded-xl bg-orange-600 px-7 py-3.5 font-semibold text-white shadow-xl shadow-orange-200 transition hover:bg-orange-700"
              >
                Start Creating

                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#features"
                className="rounded-xl border border-gray-300 bg-white px-7 py-3.5 font-semibold text-gray-700 transition hover:border-orange-500 hover:text-orange-600"
              >
                Explore Features
              </a>

            </div>

            {/* Trust Points */}

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-gray-600">

              <div className="flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-green-500"
                />
                AI Powered
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-green-500"
                />
                Easy Collaboration
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle
                  size={18}
                  className="text-green-500"
                />
                Fast Publishing
              </div>

            </div>

          </motion.div>

          {/* RIGHT */}

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >

            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-orange-300 to-orange-500 opacity-20 blur-2xl" />

            <div className="relative rounded-3xl border border-gray-100 bg-white p-3 shadow-2xl">

              <Image
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200"
                alt="AI Documentation"
                width={1200}
                height={800}
                priority
                className="h-[450px] w-full rounded-2xl object-cover"
              />

              {/* Floating Card */}

              <div className="absolute -bottom-7 -left-7 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                  <CheckCircle size={26} />
                </div>

                <div>

                  <h4 className="font-semibold text-gray-900">
                    Documentation Ready
                  </h4>

                  <p className="text-sm text-gray-500">
                    AI review completed
                  </p>

                </div>

              </div>

            </div>

          </motion.div>

        </div>

      </div>

    </section>
  );
}