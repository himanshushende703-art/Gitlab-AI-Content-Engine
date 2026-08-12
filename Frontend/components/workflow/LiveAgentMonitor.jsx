
"use client";

import {
  FiSearch,
  FiEdit3,
  FiShield,
  FiCheckCircle,
  FiUploadCloud,
} from "react-icons/fi";

const agents = [
  {
    name: "Context Analysis",
    description: "Retrieves GitLab source materials and project context.",
    icon: <FiSearch size={22} />,
  },
  {
    name: "AI Writer",
    description: "Generates documentation using AI models.",
    icon: <FiEdit3 size={22} />,
  },
  {
    name: "Technical Reviewer",
    description: "Validates technical accuracy and consistency.",
    icon: <FiShield size={22} />,
  },
  {
    name: "Documentation Lead",
    description: "Reviews and approves the generated document.",
    icon: <FiCheckCircle size={22} />,
  },
  {
    name: "Publisher",
    description: "Publishes the approved documentation.",
    icon: <FiUploadCloud size={22} />,
  },
];

export default function LiveAgentMonitor({ currentStage = 0 }) {
  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm p-8">

      {/* Header */}

      <div className="flex items-center justify-between mb-8">

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Live AI Agent Monitoring
          </h2>

          <p className="mt-2 text-gray-600">
            Monitor the execution status of every AI agent in the documentation workflow.
          </p>
        </div>

        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
          {currentStage + 1} / {agents.length} Active
        </span>

      </div>

      {/* Agent Cards */}

      <div className="space-y-5">

        {agents.map((agent, index) => {

          let status = "Waiting";
          let badge =
            "bg-gray-100 text-gray-600";
          let border =
            "border-gray-200";
          let iconBg =
            "bg-gray-100 text-gray-500";

          if (index < currentStage) {
            status = "Completed";
            badge =
              "bg-green-100 text-green-700";
            border =
              "border-green-200";
            iconBg =
              "bg-green-100 text-green-600";
          }

          if (index === currentStage) {
            status = "Running";
            badge =
              "bg-blue-100 text-blue-700";
            border =
              "border-blue-300";
            iconBg =
              "bg-blue-100 text-blue-600";
          }

          return (
            <div
              key={agent.name}
              className={`rounded-xl border ${border} bg-white p-6 shadow-sm hover:shadow-md transition-all`}
            >

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                {/* Left */}

                <div className="flex items-center gap-5">

                  <div
                    className={`h-14 w-14 rounded-xl flex items-center justify-center ${iconBg}`}
                  >
                    {agent.icon}
                  </div>

                  <div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      {agent.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {agent.description}
                    </p>

                  </div>

                </div>

                {/* Right */}

                <div className="flex items-center gap-4">

                  {status === "Running" && (
                    <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></div>
                  )}

                  <span
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${badge}`}
                  >
                    {status}
                  </span>

                </div>

              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}