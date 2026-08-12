"use client";

import Reveal from "./Reveal";

function WorkflowStep({ number, title, text }) {
  return (
    <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition duration-300">

      <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold">
        {number}
      </div>

      <h3 className="text-2xl font-bold mt-6 text-gray-900">
        {title}
      </h3>

      <p className="mt-4 text-gray-600 leading-7">
        {text}
      </p>

    </div>
  );
}

export default function Workflow() {
  return (
    <section
      id="workflow"
      className="py-24 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto px-6">

        <Reveal className="text-center">

          <span className="text-orange-600 font-semibold tracking-wider uppercase">
            SIMPLE WORKFLOW
          </span>

          <h2 className="text-4xl md:text-5xl font-bold mt-3 text-gray-900">
            From Idea to Documentation
          </h2>

          <p className="text-gray-500 mt-5 max-w-2xl mx-auto text-lg">
            Let AI handle the repetitive work while your team
            focuses on what matters.
          </p>

        </Reveal>

        <Reveal delay={0.15} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">

          <WorkflowStep
            number="01"
            title="Create"
            text="Enter your technical content or project information."
          />

          <WorkflowStep
            number="02"
            title="Generate"
            text="AI creates a structured documentation draft."
          />

          <WorkflowStep
            number="03"
            title="Review"
            text="AI agents review and improve the content."
          />

          <WorkflowStep
            number="04"
            title="Publish"
            text="Approve and publish your final documentation."
          />

        </Reveal>

      </div>
    </section>
  );
}