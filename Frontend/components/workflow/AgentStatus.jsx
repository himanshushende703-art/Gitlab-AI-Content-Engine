"use client";

import {
  Bot,
  CheckCircle,
  Clock3,
  Loader2,
} from "lucide-react";

export default function AgentStatus({
  agents = [
    {
      id: 1,
      name: "Context Analysis",
      status: "Completed",
    },
    {
      id: 2,
      name: "Writer",
      status: "Completed",
    },
    {
      id: 3,
      name: "Technical Reviewer",
      status: "Running",
    },
    {
      id: 4,
      name: "Documentation Lead",
      status: "Waiting",
    },
    {
      id: 5,
      name: "Publisher",
      status: "Waiting",
    },
  ],
}) {
  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return {
          bg: "bg-green-500",
          text: "text-green-400",
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
        };

      case "running":
        return {
          bg: "bg-yellow-500",
          text: "text-yellow-400",
          icon: (
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
          ),
        };

      default:
        return {
          bg: "bg-gray-500",
          text: "text-gray-400",
          icon: <Clock3 className="w-5 h-5 text-gray-400" />,
        };
    }
  };

  return (
    <section className="rounded-2xl border border-gray-800 bg-[#161b22] p-6 lg:p-8">

      <div className="flex items-center gap-3 mb-8">
        <Bot className="w-7 h-7 text-orange-500" />

        <div>
          <h2 className="text-2xl font-bold text-white">
            AI Agent Monitoring
          </h2>

          <p className="text-sm text-gray-400">
            Monitor every stage of the AI documentation workflow.
          </p>
        </div>
      </div>

      <div className="space-y-4">

        {agents.map((agent) => {
          const style = getStatusStyle(agent.status);

          return (
            <div
              key={agent.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-gray-700 bg-[#0d1117] p-5 hover:border-orange-500 transition"
            >
              <div className="flex items-center gap-4">

                <div
                  className={`${style.bg} w-4 h-4 rounded-full`}
                />

                <div>

                  <h3 className="font-semibold text-white">
                    {agent.name}
                  </h3>

                  <p className="text-sm text-gray-400">
                    AI Workflow Agent
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2">

                {style.icon}

                <span
                  className={`font-medium ${style.text}`}
                >
                  {agent.status}
                </span>

              </div>
            </div>
          );
        })}

      </div>
    </section>
  );
}