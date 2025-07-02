import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiService, dataUtils } from "../services/api";
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LightBulbIcon,
  CpuChipIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [errorRateSeries, setErrorRateSeries] = useState([]);
  const [responseTimeSeries, setResponseTimeSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [rootCause, setRootCause] = useState(null);
  const [rootCauseLoading, setRootCauseLoading] = useState(false);

  // Chart colors
  const colors = {
    primary: "#3b82f6",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    gray: "#6b7280",
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [analyticsData, errorRateData, responseTimeData] =
        await Promise.all([
          apiService.getAnalytics(),
          apiService.getErrorRateTimeSeries("24h", "1h"),
          apiService.getResponseTimeTimeSeries("24h", "1h"),
        ]);
      setAnalytics(analyticsData);
      setErrorRateSeries(
        errorRateData.map((d) => ({
          time: new Date(d.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: d.error_rate,
        }))
      );
      setResponseTimeSeries(
        responseTimeData.map((d) => ({
          time: new Date(d.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: d.avg_response_time_ms / 1000, // convert ms to s
        }))
      );
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch root cause analysis
  const fetchRootCauseAnalysis = async () => {
    try {
      setRootCauseLoading(true);
      const result = await apiService.getRootCause();
      setRootCause(result.root_cause);
    } catch (error) {
      toast.error("Failed to fetch root cause analysis");
    } finally {
      setRootCauseLoading(false);
    }
  };

  // Error type distribution
  const errorTypes = analytics?.log_analytics?.error_types || {};
  const errorTypeData = Object.entries(errorTypes).map(
    ([type, count], index) => ({
      name: type.replace(/_/g, " ").toUpperCase(),
      value: count,
      color: [colors.danger, colors.warning, colors.gray, colors.purple][
        index % 4
      ],
    })
  );

  // Service performance data
  const servicePerformance = analytics?.log_analytics?.services || {};
  const serviceData = Object.entries(servicePerformance).map(
    ([service, data]) => ({
      service,
      avgLatency: data.avg_latency || 0,
      totalRequests: data.total_requests || 0,
      errors: data.errors || 0,
    })
  );

  // Key metrics
  const keyMetrics = [
    {
      title: "Total Requests",
      value: analytics?.log_analytics?.total_requests || 0,
      subtitle: "Last hour",
      icon: ChartBarIcon,
      color: "primary",
    },
    {
      title: "Error Rate",
      value: analytics?.log_analytics?.error_rate || "0%",
      subtitle: "System health",
      icon: ExclamationTriangleIcon,
      color: "danger",
    },
    {
      title: "Avg Response Time",
      value: dataUtils.formatDuration(
        analytics?.log_analytics?.latency_analysis?.average_ms / 1000
      ),
      subtitle: "Performance",
      icon: ClockIcon,
      color: "warning",
    },
    {
      title: "Success Rate",
      value: analytics?.log_analytics?.throughput?.success_rate || "0%",
      subtitle: "Reliability",
      icon: ChartBarIcon,
      color: "success",
    },
  ];

  // Export AI analysis as PDF
  const exportAnalysisAsPDF = () => {
    if (!rootCause?.root_cause?.root_cause) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("AI Root Cause Analysis", 10, 15);
    doc.setFontSize(12);
    // Split text into lines for better formatting
    const lines = doc.splitTextToSize(rootCause.root_cause.root_cause, 180);
    doc.text(lines, 10, 30);
    doc.save("ai-analysis.pdf");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-xs rounded-xl shadow-sm px-6 py-4 mb-4 border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1 flex items-center">
            <ChartBarIcon className="w-7 h-7 text-primary-600 mr-2" />
            Analytics & AI Insights
          </h1>
          <p className="text-lg text-gray-600">
            Advanced analytics and AI-powered root cause analysis
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-base text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="btn btn-primary shadow-md hover:scale-105 transition-transform"
          >
            <ArrowPathIcon
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            icon={metric.icon}
            color={metric.color}
            loading={loading}
          />
        ))}
      </div>

      {/* AI Root Cause Analysis */}
      <div className="card animate-fadeIn mt-8">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="w-6 h-6 text-purple-600" />
            <h2 className="card-title">AI Root Cause Analysis</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportAnalysisAsPDF}
              disabled={!rootCause?.root_cause?.root_cause}
              className="btn btn-secondary"
              title="Export AI Analysis as PDF"
            >
              Export as PDF
            </button>
            <button
              onClick={fetchRootCauseAnalysis}
              disabled={rootCauseLoading}
              className="btn btn-secondary"
            >
              <LightBulbIcon
                className={`w-4 h-4 mr-2 ${
                  rootCauseLoading ? "animate-spin" : ""
                }`}
              />
              {rootCauseLoading ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>
        </div>
        <div className="p-6">
          {rootCause ? (
            <div className="space-y-4">
              {rootCause.root_cause?.anomalies &&
              rootCause.root_cause.anomalies.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-danger-500 mr-2" />
                    Detected Anomalies
                  </h3>
                  <div className="space-y-2">
                    {rootCause.root_cause.anomalies.map((anomaly, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-800">{anomaly}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <ServerIcon className="w-5 h-5 text-green-500" />
                  <span className="text-green-800">
                    No anomalies detected - system is healthy
                  </span>
                </div>
              )}

              {rootCause.root_cause?.root_cause && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <LightBulbIcon className="w-5 h-5 text-purple-500 mr-2" />
                    AI Analysis
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="text-gray-800">
                        <ReactMarkdown>
                          {rootCause.root_cause.root_cause}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <LightBulbIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Click "Run Analysis" to get AI-powered insights
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Rate Over Time */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Error Rate Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={errorRateSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, "Error Rate"]} />
              <Bar dataKey="value" fill={colors.danger} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response Time Over Time */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Response Time Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={responseTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}s`, "Response Time"]} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.warning}
                strokeWidth={2}
                dot={{ fill: colors.warning, strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Type Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Error Type Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={errorTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {errorTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Service Performance */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Service Performance</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="avgLatency"
                fill={colors.primary}
                name="Avg Latency (ms)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Codes */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Response Code Distribution</h2>
          </div>
          <div className="p-6">
            {analytics?.log_analytics?.response_codes ? (
              <div className="space-y-3">
                {Object.entries(analytics.log_analytics.response_codes).map(
                  ([code, count]) => (
                    <div
                      key={code}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <StatusBadge
                          status={
                            code.startsWith("2")
                              ? "success"
                              : code.startsWith("4")
                              ? "warning"
                              : "error"
                          }
                          text={code}
                        />
                        <span className="text-sm text-gray-600">
                          {code.startsWith("2")
                            ? "Success"
                            : code.startsWith("4")
                            ? "Client Error"
                            : code.startsWith("5")
                            ? "Server Error"
                            : "Other"}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No response code data available
              </p>
            )}
          </div>
        </div>

        {/* Service Health */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Service Health Overview</h2>
          </div>
          <div className="p-6">
            {analytics?.log_analytics?.services ? (
              <div className="space-y-4">
                {Object.entries(analytics.log_analytics.services).map(
                  ([service, data]) => (
                    <div
                      key={service}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {service}
                        </h3>
                        <StatusBadge
                          status={data.errors > 0 ? "warning" : "success"}
                          text={data.errors > 0 ? "Issues" : "Healthy"}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requests:</span>
                          <div className="font-semibold">
                            {data.total_requests}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Errors:</span>
                          <div className="font-semibold text-red-600">
                            {data.errors}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Avg Latency:</span>
                          <div className="font-semibold">
                            {data.avg_latency
                              ? `${data.avg_latency.toFixed(1)}ms`
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No service data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Time Series Analysis */}
      {analytics?.log_analytics?.time_series && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Time Series Analysis</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(analytics.log_analytics.time_series).map(
                ([window, data]) => (
                  <div
                    key={window}
                    className="text-center p-4 bg-gray-50 rounded-lg"
                  >
                    <h3 className="font-semibold text-gray-900 capitalize mb-2">
                      {window.replace(/_/g, " ")}
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">
                          Total Requests:
                        </span>
                        <div className="text-xl font-bold text-gray-900">
                          {data.total}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Errors:</span>
                        <div className="text-lg font-semibold text-red-600">
                          {data.errors}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">
                          Error Rate:
                        </span>
                        <div className="text-lg font-semibold">
                          {data.total > 0
                            ? `${((data.errors / data.total) * 100).toFixed(
                                1
                              )}%`
                            : "0%"}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
