import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  ServerIcon,
} from "@heroicons/react/24/outline";
import MetricCard from "../components/MetricCard";
import toast from "react-hot-toast";

const Metrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [prometheusData, setPrometheusData] = useState(null);
  const [errorRateSeries, setErrorRateSeries] = useState([]);
  const [httpRequestsSeries, setHttpRequestsSeries] = useState([]);
  const [responseTimeSeries, setResponseTimeSeries] = useState([]);
  const [cpuUsageSeries, setCpuUsageSeries] = useState([]);
  const [memoryUsageSeries, setMemoryUsageSeries] = useState([]);
  const [responseCodeData, setResponseCodeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [windowValue, setWindowValue] = useState("6h");
  const [intervalValue, setIntervalValue] = useState("5m");

  // Chart colors
  const colors = {
    primary: "#3b82f6",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    gray: "#6b7280",
  };

  // Fetch metrics data
  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      const [
        metricsData,
        prometheusStatus,
        errorRateData,
        httpRequestsData,
        responseTimeData,
        cpuUsageData,
        memoryUsageData,
        responseCodeDist,
      ] = await Promise.all([
        apiService.getMetrics(),
        apiService.getPrometheusStatus(),
        apiService.getErrorRateTimeSeries(windowValue, intervalValue),
        apiService.getHttpRequestsTimeSeries(windowValue, intervalValue),
        apiService.getResponseTimeTimeSeries(windowValue, intervalValue),
        apiService.getCpuUsageTimeSeries(windowValue, intervalValue),
        apiService.getMemoryUsageTimeSeries(windowValue, intervalValue),
        apiService.getResponseCodeDistribution(windowValue),
      ]);

      setMetrics(metricsData);
      setPrometheusData(prometheusStatus);

      // Format time series for charts (convert UTC to local time)
      setErrorRateSeries(
        errorRateData.map((d) => ({
          time: new Date(d.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: d.error_rate,
        }))
      );
      setHttpRequestsSeries(
        httpRequestsData.map((d) => ({
          time: new Date(d.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: d.total,
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
      setCpuUsageSeries(
        cpuUsageData.map((d) => ({
          time: new Date(d.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: d.cpu_percent,
        }))
      );
      setMemoryUsageSeries(
        memoryUsageData.map((d) => ({
          time: new Date(d.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: d.memory_mb,
        }))
      );
      // Response code pie chart
      const totalCodes = Object.values(responseCodeDist).reduce(
        (a, b) => a + b,
        0
      );
      setResponseCodeData([
        {
          name: "2xx Success",
          value: responseCodeDist["200"] || 0,
          color: colors.success,
        },
        {
          name: "4xx Client Error",
          value:
            (responseCodeDist["400"] || 0) +
            (responseCodeDist["401"] || 0) +
            (responseCodeDist["404"] || 0),
          color: colors.warning,
        },
        {
          name: "5xx Server Error",
          value:
            (responseCodeDist["500"] || 0) +
            (responseCodeDist["502"] || 0) +
            (responseCodeDist["503"] || 0),
          color: colors.danger,
        },
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      toast.error("Failed to load metrics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsData();
    const interval = setInterval(fetchMetricsData, 30000);
    return () => clearInterval(interval);
  }, [windowValue, intervalValue]);

  // Service metrics
  const serviceMetrics = [
    {
      title: "HTTP Requests",
      value: metrics?.log_metrics?.total || 0,
      subtitle: "Total requests",
      icon: ChartBarIcon,
      color: "primary",
    },
    {
      title: "Error Rate",
      value: `${(
        metrics?.log_metrics?.performance_metrics?.error_rate || 0
      ).toFixed(2)}%`,
      subtitle: "Last hour",
      icon: ExclamationTriangleIcon,
      color: "danger",
    },
    {
      title: "Avg Response Time",
      value: dataUtils.formatDuration(
        metrics?.log_metrics?.performance_metrics?.avg_latency_ms / 1000
      ),
      subtitle: "Request latency",
      icon: ClockIcon,
      color: "warning",
    },
    {
      title: "Active Services",
      value:
        prometheusData?.targets?.filter((t) => t.health === "up").length || 0,
      subtitle: "Healthy targets",
      icon: ChartBarIcon,
      color: "success",
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-xs rounded-xl shadow-sm px-6 py-4 mb-4 border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
            Metrics & Analytics
          </h1>
          <p className="text-lg text-gray-600">
            Prometheus metrics and performance data
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-base text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchMetricsData}
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

      {/* Time Window & Interval Selectors */}
      <div className="flex flex-wrap items-center gap-4 mb-2">
        {/* Time Window Selector */}
        <div className="relative">
          <label className="text-sm font-medium text-gray-700 mr-2">
            Time Window:
          </label>
          <select
            value={windowValue}
            onChange={(e) => setWindowValue(e.target.value)}
            className="input rounded-lg border border-primary-200 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 shadow-sm px-3 py-2 bg-white text-gray-900 transition-all duration-150 hover:border-primary-400"
          >
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="12h">Last 12 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>
        {/* Interval Selector */}
        <div className="relative">
          <label className="text-sm font-medium text-gray-700 mr-2">
            Interval:
          </label>
          <select
            value={intervalValue}
            onChange={(e) => setIntervalValue(e.target.value)}
            className="input rounded-lg border border-primary-200 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 shadow-sm px-3 py-2 bg-white text-gray-900 transition-all duration-150 hover:border-primary-400"
          >
            <option value="1m">1 minute</option>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {serviceMetrics.map((metric, index) => (
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HTTP Requests Over Time */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">HTTP Requests Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={httpRequestsSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
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

        {/* Error Rate Over Time */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Error Rate Over Time</h2>
            <div className="flex gap-2 mt-2">
              <span className="text-xs text-gray-500">
                Window: {windowValue}
              </span>
              <span className="text-xs text-gray-500">
                Interval: {intervalValue}
              </span>
            </div>
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

        {/* Response Code Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Response Code Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={responseCodeData}
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
                {responseCodeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">CPU Usage Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cpuUsageSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, "CPU Usage"]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Usage */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Memory Usage Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={memoryUsageSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.success}
                fill={colors.success}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Prometheus Metrics Section */}
      <div className="card mt-8 animate-fadeIn">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="w-6 h-6 text-primary-600" />
            <h2 className="card-title">Prometheus Metrics</h2>
          </div>
          <span
            className={
              prometheusData?.status === "healthy"
                ? "text-success-700 bg-success-100 px-3 py-1 rounded-full text-xs font-semibold"
                : "text-danger-700 bg-danger-100 px-3 py-1 rounded-full text-xs font-semibold"
            }
          >
            {prometheusData?.status === "healthy" ? "Healthy" : "Unhealthy"}
          </span>
        </div>
        <div className="p-6 space-y-6">
          {/* Scrape Targets */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <ServerIcon className="w-5 h-5 text-primary-500 mr-2" />
              Scrape Targets
            </h3>
            {prometheusData?.targets && prometheusData.targets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prometheusData.targets.map((target, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm"
                  >
                    <div>
                      <div className="font-medium text-gray-800 flex items-center">
                        <ServerIcon className="w-4 h-4 text-primary-400 mr-1" />
                        {target.labels.job || target.labels.service}
                      </div>
                      <div className="text-xs text-gray-500">
                        {target.scrapeUrl}
                      </div>
                    </div>
                    <span
                      className={
                        target.health === "up"
                          ? "text-success-700 bg-success-100 px-3 py-1 rounded-full text-xs font-semibold"
                          : "text-danger-700 bg-danger-100 px-3 py-1 rounded-full text-xs font-semibold"
                      }
                    >
                      {target.health}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No Prometheus targets found.</p>
            )}
          </div>
          {/* Available Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <ChartBarIcon className="w-5 h-5 text-primary-500 mr-2" />
              Available Metrics
            </h3>
            {prometheusData?.available_metrics &&
            prometheusData.available_metrics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prometheusData.available_metrics
                  .slice(0, 20)
                  .map((metric, idx) => (
                    <span
                      key={idx}
                      className="bg-primary-50 text-primary-700 px-2 py-1 rounded text-xs font-mono border border-primary-100 shadow-sm hover:bg-primary-100 transition-colors cursor-pointer"
                      title={metric}
                    >
                      {metric}
                    </span>
                  ))}
                {prometheusData.available_metrics.length > 20 && (
                  <span className="text-gray-500">
                    +{prometheusData.available_metrics.length - 20} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No metrics found.</p>
            )}
          </div>
          {/* Metrics Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning-500 mr-2" />
              Metrics Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-primary-50 rounded-lg text-center shadow-sm">
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-primary-400 mr-1" />
                  HTTP Requests
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {prometheusData?.metrics_summary?.http_requests}
                </div>
              </div>
              <div className="p-3 bg-success-50 rounded-lg text-center shadow-sm">
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <ClockIcon className="w-4 h-4 text-success-400 mr-1" />
                  Auth Attempts
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {prometheusData?.metrics_summary?.auth_attempts}
                </div>
              </div>
              <div className="p-3 bg-primary-50 rounded-lg text-center shadow-sm">
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-primary-400 mr-1" />
                  JWT Tokens
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {prometheusData?.metrics_summary?.jwt_tokens}
                </div>
              </div>
              <div className="p-3 bg-success-50 rounded-lg text-center shadow-sm">
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-success-400 mr-1" />
                  DB Operations
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {prometheusData?.metrics_summary?.db_operations}
                </div>
              </div>
              <div className="p-3 bg-danger-50 rounded-lg text-center shadow-sm col-span-2 md:col-span-1">
                <div className="text-sm text-gray-500 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-4 h-4 text-danger-400 mr-1" />
                  Errors
                </div>
                <div className="text-lg font-bold text-danger-700">
                  {prometheusData?.metrics_summary?.errors}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metrics;
