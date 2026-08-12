"use client";

import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import Reveal from "./Reveal";

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-orange-600 py-24 text-white">
      {/* Background Circles */}
      <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10" />

      <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/10" />

      <Reveal className="relative mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl font-bold md:text-5xl">
          Ready to Create Better Documentation?
        </h2>

        <p className="mt-6 text-lg leading-8 text-orange-100">
          Start creating AI-powered documentation and make your workflow
          10x faster with intelligent content generation, automated review,
          and seamless publishing.
        </p>

        <Link
          href="/signup"
          className="mt-10 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-bold text-orange-600 shadow-xl transition hover:bg-gray-100"
        >
          Create Free Account
          <FiArrowRight className="text-xl" />
        </Link>
      </Reveal>
    </section>
  );
}