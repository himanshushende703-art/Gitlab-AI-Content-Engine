
"use client";

import {
  FiEdit3,
  FiCheckCircle,
  FiShield,
  FiUploadCloud,
  FiArrowRight,
} from "react-icons/fi";


const STEP_DEFS = [
  {
    id: 1,
    title: "AI Writer",
    description: "Generate documentation from GitLab source materials using AI.",
    icon: <FiEdit3 size={24} />,
    color: "bg-blue-600",
    statuses: ["intake", "context_preparation", "drafting"],
  },
  {
    id: 2,
    title: "Technical Review",
    description: "Validate technical accuracy and improve content quality.",
    icon: <FiShield size={24} />,
    color: "bg-amber-500",
    statuses: ["technical_review", "tone_optimization", "ready_for_human_review"],
  },
  {
    id: 3,
    title: "Documentation Approval",
    description: "Review and approve documentation before publishing.",
    icon: <FiCheckCircle size={24} />,
    color: "bg-green-600",
    statuses: ["approved"],
  },
  {
    id: 4,
    title: "Publish",
    description: "Export documentation and publish to the selected destination.",
    icon: <FiUploadCloud size={24} />,
    color: "bg-purple-600",
    statuses: ["published"],
  },
];

export default function WorkflowTracker({ jobs = [] }) {
  const steps = STEP_DEFS.map((step) => ({
    ...step,
    count: jobs.filter((j) => step.statuses.includes(j.status)).length,
  }));

  return (
    <section className="rounded-2xl bg-white">

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Documentation Workflow
        </h2>

        <p className="mt-2 text-gray-600">
          Monitor every stage of the AI-powered documentation lifecycle —
          numbers reflect how many documents are in each stage right now.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {steps.map((step, index) => (

          <div
            key={step.id}
            className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >

            {/* Connector */}
            {index !== steps.length - 1 && (
              <div className="hidden lg:flex absolute top-12 -right-8 z-10 items-center">
                <FiArrowRight className="text-gray-400 text-xl" />
              </div>
            )}

            {/* Icon */}
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl ${step.color} text-white`}
            >
              {step.icon}
            </div>

            {/* Step Number */}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-blue-600">
              Step {step.id}
            </p>

            {/* Title */}
            <h3 className="mt-2 text-xl font-bold text-gray-900">
              {step.title}
            </h3>

            {/* Description */}
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {step.description}
            </p>

                       <div className="mt-6">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${step.count > 0
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
                  }`}
              >
                {step.count} document{step.count === 1 ? "" : "s"} here now
              </span>
            </div>

          </div>

        ))}

      </div>

    </section>
  );
}