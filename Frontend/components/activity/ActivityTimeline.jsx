
"use client";

import {
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

export default function ActivityTimeline({ jobs = [] }) {
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

          <h2 className="text-3xl font-bold text-gray-900">
            Recent Activity
          </h2>

          <p className="mt-2 text-gray-600">
            View the latest documentation activities across the AI workflow.
          </p>

        </div>

      </div>

      {/* Timeline Card */}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">

        {jobs.length === 0 ? (

          <div className="py-16 text-center">

            <FiAlertCircle className="mx-auto text-5xl text-gray-300" />

            <h3 className="mt-4 text-xl font-semibold text-gray-700">
              No Recent Activity
            </h3>

            <p className="mt-2 text-gray-500">
              Activity will appear here after documents are generated.
            </p>

          </div>

        ) : (

          <div className="relative">

            {jobs.slice(0, 15).map((job, index) => (

              <div
                key={job.job_id}
                className="relative flex gap-6 pb-8"
              >

                {/* Timeline */}

                <div className="flex flex-col items-center">

                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">

                    <FiFileText className="text-blue-600 text-lg" />

                  </div>

                  {index !== jobs.slice(0, 15).length - 1 && (

                    <div className="mt-2 w-0.5 flex-1 bg-gray-200"></div>

                  )}

                </div>

                {/* Content */}

                <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-5 hover:bg-white hover:shadow-md transition">

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                    <div>

                      <h3 className="text-lg font-semibold text-gray-900">
                        {job.draft_title || "Untitled Document"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Owner: {job.owner_email}
                      </p>

                    </div>

                    <span
                      className={`rounded-full px-4 py-1 text-sm font-medium ${getStatusStyle(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>

                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">

                    <FiClock />

                    {job.created_at
                      ? new Date(job.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Date unavailable"}

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* Footer */}

      {jobs.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing the latest{" "}
          <span className="font-semibold">
            {Math.min(jobs.length, 15)}
          </span>{" "}
          activities.
        </div>
      )}

    </section>
  );
}