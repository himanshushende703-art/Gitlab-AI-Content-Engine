"use client";

import {
  FiFileText,
  FiLayers,
  FiUsers,
  FiEdit3,
  FiShield,
  FiZap,
} from "react-icons/fi";
import Reveal from "./Reveal";

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="group bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">

      <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl group-hover:bg-orange-600 group-hover:text-white transition">
        {icon}
      </div>

      <h3 className="mt-6 text-2xl font-bold text-gray-900">
        {title}
      </h3>

      <p className="mt-4 text-gray-600 leading-7">
        {desc}
      </p>

    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 bg-white"
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Section Heading */}

        <Reveal className="text-center max-w-2xl mx-auto">

          <span className="text-orange-600 font-semibold tracking-widest uppercase">
            Powerful Features
          </span>

          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900">
            Everything You Need
          </h2>

          <p className="mt-6 text-lg text-gray-600">
            Create, manage and publish high-quality documentation
            using intelligent AI workflows designed for modern
            development teams.
          </p>

        </Reveal>

        {/* Features Grid */}

        <Reveal delay={0.15} className="grid gap-8 mt-16 md:grid-cols-2 lg:grid-cols-3">

          <FeatureCard
            icon={<FiFileText />}
            title="AI Draft Generation"
            desc="Generate release notes, API documentation, onboarding guides and technical blogs in seconds."
          />

          <FeatureCard
            icon={<FiLayers />}
            title="Multi-Agent Workflow"
            desc="Use specialized AI agents for writing, reviewing, improving tone and publishing."
          />

          <FeatureCard
            icon={<FiUsers />}
            title="Team Collaboration"
            desc="Collaborate with your team to review, approve and publish documentation efficiently."
          />

          <FeatureCard
            icon={<FiEdit3 />}
            title="Smart Editing"
            desc="Improve grammar, readability, tone and technical clarity using AI-powered suggestions."
          />

          <FeatureCard
            icon={<FiShield />}
            title="Quality Review"
            desc="Automatically review generated content for quality, consistency and technical accuracy."
          />

          <FeatureCard
            icon={<FiZap />}
            title="Fast Publishing"
            desc="Move from idea to production-ready documentation with a streamlined AI workflow."
          />

        </Reveal>

      </div>
    </section>
  );
}