"use client";

import { FiFileText, FiCheckCircle } from "react-icons/fi";
import Reveal from "./Reveal";

function AboutPoint({ text }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
        <FiCheckCircle className="text-orange-600 text-xl" />
      </div>

      <p className="text-gray-700 text-lg">
        {text}
      </p>
    </div>
  );
}

export default function About() {
  return (
    <section
      id="about"
      className="py-24 bg-white"
    >
      <div className="max-w-6xl mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Side */}

          <Reveal>

            <span className="text-orange-600 font-semibold tracking-wider uppercase">
              BUILT FOR MODERN TEAMS
            </span>

            <h2 className="text-4xl md:text-5xl font-bold mt-4 leading-tight text-gray-900">
              Your AI Content &
              <br />
              Documentation Engine
            </h2>

            <p className="mt-6 text-lg text-gray-600 leading-8">
              Our platform helps engineering and documentation
              teams create high-quality technical content faster.
              From release notes to API documentation, AI helps
              your team move from idea to published content.
            </p>

            <div className="mt-10 space-y-5">

              <AboutPoint text="Generate technical content automatically" />

              <AboutPoint text="Improve content quality with AI review" />

              <AboutPoint text="Collaborate with your entire team" />

              <AboutPoint text="Publish documentation faster" />

            </div>

          </Reveal>

          {/* Right Side */}

          <Reveal delay={0.15} className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-3xl p-10 lg:p-12 text-white shadow-2xl">

            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
              <FiFileText size={42} />
            </div>

            <h3 className="text-3xl md:text-4xl font-bold mt-8 leading-tight">
              Documentation,
              <br />
              Simplified.
            </h3>

            <p className="mt-6 text-orange-100 text-lg leading-8">
              Reduce manual work and create consistent,
              professional documentation with AI-powered
              workflows designed for modern engineering
              teams.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-6">

              <div>
                <h4 className="text-4xl font-bold">
                  10x
                </h4>

                <p className="text-orange-100 mt-2">
                  Faster Content
                </p>
              </div>

              <div>
                <h4 className="text-4xl font-bold">
                  AI
                </h4>

                <p className="text-orange-100 mt-2">
                  Powered Workflow
                </p>
              </div>

            </div>

          </Reveal>

        </div>

      </div>
    </section>
  );
}