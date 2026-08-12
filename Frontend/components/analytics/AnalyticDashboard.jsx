
"use client";

import {
  FiFileText,
  FiCheckCircle,
  FiUploadCloud,
  FiAlertCircle,
} from "react-icons/fi";


export default function AnalyticsDashboard({ stats, jobs }) {
  const cards = [
    {
      title: "Total Documents",
      value: stats?.total || 0,
      icon: <FiFileText className="h-7 w-7 text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      title: "Approved",
      value: stats?.approved || 0,
      icon: <FiCheckCircle className="h-7 w-7 text-green-600" />,
      bg: "bg-green-50",
    },
    {
      title: "Published",
      value: stats?.published || 0,
      icon: <FiUploadCloud className="h-7 w-7 text-purple-600" />,
      bg: "bg-purple-50",
    },
    {
      title: "Failed",
      value: stats?.failed || 0,
      icon: <FiAlertCircle className="h-7 w-7 text-red-600" />,
      bg: "bg-red-50",
    },
  ];

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";

      case "published":
        return "bg-purple-100 text-purple-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "draft":
      case "drafting":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <section className="space-y-8">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Monitor documentation performance, workflow progress, and recent AI-generated documents.
          </p>

        </div>

      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

        {cards.map((card) => (

          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 p-6"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-gray-500">
                  {card.title}
                </p>

                <h2 className="mt-3 text-4xl font-bold text-gray-900">
                  {card.value}
                </h2>

              </div>

              <div className={`rounded-xl p-4 ${card.bg}`}>
                {card.icon}
              </div>

            </div>

          </div>

        ))}

      </div>

      {/* Recent Documents */}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

          <div>

            <h2 className="text-xl font-semibold text-gray-900">
              Recent Documents
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Latest AI-generated documentation available in your repository.
            </p>

          </div>

        </div>

        {jobs?.length === 0 ? (

          <div className="py-20 text-center">

            <div className="text-6xl mb-4">
              📄
            </div>

            <h3 className="text-xl font-semibold text-gray-800">
              No Documents Found
            </h3>

            <p className="mt-2 text-gray-500">
              Generated documentation will appear here.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead className="bg-gray-50">

                <tr>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Document Title
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Owner
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-200">

                {jobs.slice(0, 10).map((job) => (

                  <tr
                    key={job.job_id}
                    className="hover:bg-gray-50 transition"
                  >

                    <td className="px-6 py-5">

                      <div>

                        <p className="font-semibold text-gray-900">
                          {job.draft_title || "Untitled Document"}
                        </p>

                        <p className="text-sm text-gray-500">
                          ID: {job.job_id}
                        </p>

                      </div>

                    </td>

                    <td className="px-6 py-5 text-gray-700">
                      {job.owner_email}
                    </td>

                    <td className="px-6 py-5">

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusStyle(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
}