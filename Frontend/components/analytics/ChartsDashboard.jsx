
"use client";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from "recharts";

export default function ChartsDashboard({ stats }) {
    const pieData = [
        { name: "Draft", value: stats?.draft || 0 },
        { name: "Approved", value: stats?.approved || 0 },
        { name: "Published", value: stats?.published || 0 },
        { name: "Failed", value: stats?.failed || 0 },
    ];

    const barData = [
        { name: "Draft", value: stats?.draft || 0 },
        { name: "Approved", value: stats?.approved || 0 },
        { name: "Published", value: stats?.published || 0 },
        { name: "Failed", value: stats?.failed || 0 },
    ];

    const COLORS = [
        "#F59E0B", // Amber
        "#22C55E", // Green
        "#8B5CF6", // Purple
        "#EF4444", // Red
    ];

    return (
        <section className="mt-10 rounded-2xl bg-white border border-gray-200 shadow-md p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        AI Analytics Dashboard
                    </h2>
                    <p className="text-gray-500 mt-1">
                        Overview of documentation workflow and AI performance.
                    </p>
                </div>

                <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                    Live Analytics
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">
                        Document Status Distribution
                    </h3>

                    <ResponsiveContainer  width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={65}
                                outerRadius={110}
                                paddingAngle={4}
                               
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index]}
                                    
                                    />
                                ))}
                            </Pie>

                            <Tooltip
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid #E5E7EB",
                                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                                }}
                            />

                            <Legend verticalAlign="bottom" height={40} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 hover:shadow-lg transition-all duration-300">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">
                        Status Comparison
                    </h3>

                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={barData}
                            margin={{
                                top: 10,
                                right: 20,
                                left: -10,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#E5E7EB"
                            />

                            <XAxis
                                dataKey="name"
                                tick={{ fill: "#6B7280", fontSize: 13 }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                tick={{ fill: "#6B7280", fontSize: 13 }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                cursor={{ fill: "#F3F4F6" }}
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid #E5E7EB",
                                    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
                                }}
                            />

                            <Bar
                                dataKey="value"
                                fill="#3B82F6"
                                radius={[10, 10, 0, 0]}
                                barSize={45}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </section>
    );
}