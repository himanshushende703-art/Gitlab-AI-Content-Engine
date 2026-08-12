
"use client";
import {
  FiTrendingUp,
  FiCpu,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

export default function RepositoryHealth({ stats }) {
  const successRate =
    stats?.total > 0
      ? Math.round(
        (((stats.approved || 0) + (stats.published || 0)) /
          stats.total) *
        100
      )
      : 0;

  const cards = [
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: FiTrendingUp,
      bg: "bg-green-100",
      iconColor: "text-green-600",
      progress: successRate,
    },
    {
      title: "AI Confidence",
      value: "94%",
      icon: FiCpu,
      bg: "bg-blue-100",
      iconColor: "text-blue-600",
      progress: 94,
    },
    {
      title: "Published",
      value: stats?.published || 0,
      icon: FiCheckCircle,
      bg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "Failed",
      value: stats?.failed || 0,
      icon: FiAlertCircle,
      bg: "bg-red-100",
      iconColor: "text-red-600",
    },
  ];

  return (
    <section className="mt-10 bg-white rounded-2xl border border-gray-200 shadow-md p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Repository Health
          </h2>
          <p className="text-gray-500 mt-1">
            Monitor documentation quality and AI performance.
          </p>
        </div>

        <div className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
          Healthy
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            {/* Icon */}
            <div
              className={`w-14 h-14 ${card.bg} rounded-xl flex items-center justify-center`}
            >
              <card.icon className={`text-2xl ${card.iconColor}`} />
            </div>

            {/* Title */}
            <p className="mt-5 text-sm font-medium text-gray-500 uppercase tracking-wide">
              {card.title}
            </p>

            {/* Value */}
            <h3 className="mt-2 text-4xl font-bold text-gray-900">
              {card.value}
            </h3>

            {/* Progress Bar */}
            {card.progress !== undefined && (
              <>
                <div className="mt-5 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-600 transition-all duration-700"
                    style={{ width: `${card.progress}%` }}
                  ></div>
                </div>

                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Performance</span>
                  <span>{card.progress}%</span>
                </div>
              </>
            )}

            {/* Footer */}
            {card.progress === undefined && (
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Current Status
                </span>

                <span
                  className={`w-3 h-3 rounded-full ${card.title === "Failed"
                    ? "bg-red-500"
                    : "bg-green-500"
                    } animate-pulse`}
                ></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}