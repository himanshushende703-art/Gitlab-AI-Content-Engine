"use client";

import Link from "next/link";

export default function DashboardCards({ dashboardStats }) {
  const cards = [
    {
      title: "Total Documents",
      value: dashboardStats?.total || 0,
      border: "border-blue-500",
      valueColor: "text-blue-600",
      dot: "bg-blue-500",
      description: "All generated documents",
      status: "all",
    },
    {
      title: "Draft",
      value: dashboardStats?.draft || 0,
      border: "border-yellow-500",
      valueColor: "text-yellow-600",
      dot: "bg-yellow-500",
      description: "Pending review",
      status: "drafting",
    },
    {
      title: "Approved",
      value: dashboardStats?.approved || 0,
      border: "border-green-500",
      valueColor: "text-green-600",
      dot: "bg-green-500",
      description: "Ready for publishing",
      status: "approved",
    },
    {
      title: "Published",
      value: dashboardStats?.published || 0,
      border: "border-purple-500",
      valueColor: "text-purple-600",
      dot: "bg-purple-500",
      description: "Live documents",
      status: "published",
    },
    {
      title: "Failed",
      value: dashboardStats?.failed || 0,
      border: "border-red-500",
      valueColor: "text-red-600",
      dot: "bg-red-500",
      description: "Generation failed",
      status: "failed",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-10">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={`/documents/${card.status}`}
          className={`block bg-white rounded-2xl border-t-4 ${card.border} border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
        >
          <div className="p-6">


            {/* Title */}
            <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              {card.title}
            </p>

            {/* Value */}
            <h2 className={`mt-3 text-5xl font-bold ${card.valueColor}`}>
              {card.value}
            </h2>

            {/* Description */}
            <p className="mt-4 text-sm text-gray-500">
              {card.description}
            </p>

           

          </div>
        </Link>
      ))}
    </section>
  );
}