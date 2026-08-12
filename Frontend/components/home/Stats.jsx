"use client";

import Reveal from "./Reveal";

function Stat({ number, text }) {
  return (
    <div className="group">
      <h2 className="text-4xl md:text-5xl font-bold text-orange-500 transition group-hover:scale-110">
        {number}
      </h2>

      <p className="mt-3 text-gray-300 text-sm md:text-base">
        {text}
      </p>
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="bg-gray-900 py-14 text-white">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">

          <Stat
            number="10x"
            text="Faster Documentation"
          />

          <Stat
            number="4+"
            text="AI Agents"
          />

          <Stat
            number="100%"
            text="Team Collaboration"
          />

          <Stat
            number="24/7"
            text="AI Assistance"
          />

        </Reveal>
      </div>
    </section>
  );
}