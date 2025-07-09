import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService, dataUtils } from "../services/api";
import {
  ServerIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import StatusBadge from "../components/StatusBadge";
import MetricCard from "../components/MetricCard";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const ServiceDetails = () => {
  const { name } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("1h");
  const [apmMetrics, setApmMetrics] = useState(null);
  const [apmLoading, setApmLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setDebugInfo("");
      try {
        // Try registered services first (since Alpha, Beta, Gamma are registered)
        const reg = await apiService.getRegisteredServices();
        const regFound = reg.registered_services?.find((s) => s.name === name);
        if (regFound) {
          setService({ ...regFound, type: "registered" });
          setDebugInfo(`Found registered service: ${name}`);
        } else {
          // Try core services as fallback
          const res = await apiService.getServices();
          const found = res.services?.find(
            (s) => s.name === name || s.displayName === name
          );
          if (found) {
            setService({ ...found, type: "core" });
            setDebugInfo(`Found core service: ${name}`);
          } else {
            setService(null);
            setDebugInfo(`Service not found: ${name}`);
          }
        }
      } catch (e) {
        setService(null);
        setDebugInfo(`Error fetching service: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [name]);

  // Fetch APM metrics for registered services
  useEffect(() => {
    if (!service || service.type !== "registered") {
      setDebugInfo(
        (prev) =>
          prev + ` | Skipping APM fetch: service type is ${service?.type}`
      );
      return;
    }

    setApmLoading(true);
    setDebugInfo(
      (prev) => prev + ` | Fetching APM metrics for ${service.name}`
    );

    apiService
      .getServiceMetrics(service.name, timeRange)
      .then((data) => {
        setApmMetrics(data.metrics);
        setDebugInfo(
          (prev) =>
            prev +
            ` | APM data received: ${
              Object.keys(data.metrics || {}).length
            } metrics`
        );
      })
      .catch((error) => {
        setApmMetrics(null);
        setDebugInfo((prev) => prev + ` | APM fetch failed: ${error.message}`);
      })
      .finally(() => setApmLoading(false));
  }, [service, timeRange]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  if (!service)
    return (
      <div className="flex flex-col items-center justify-center h-64 text-danger-600">
        <div>Service not found</div>
        <div className="text-xs text-gray-500 mt-2">{debugInfo}</div>
      </div>
    );

  // Metrics helpers
  const getMetric = (val, suffix = "", decimals = 2) =>
    val !== undefined && val !== null ? (
      `${Number(val).toFixed(decimals)}${suffix}`
    ) : (
      <span className="text-gray-400">N/A</span>
    );

  // Status
  const isDown = service.status !== "healthy" && service.status !== "warning";
  const statusLabel = isDown ? "DOWN" : "UP";
  const statusColor = isDown
    ? "bg-danger-100 text-danger-700"
    : "bg-success-100 text-success-700";

  // --- APM Breakdown Cards ---
  const latest = (arr) =>
    Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1].value : null;
  const avg = (arr) =>
    Array.isArray(arr) && arr.length > 0
      ? arr.reduce((a, b) => a + b.value, 0) / arr.length
      : null;
  const apm = apmMetrics || {};

  const breakdownCards = [
    {
      title: "Time to First Byte",
      value: getMetric(avg(apm.ttfb_ms), " ms"),
      subtitle: "Category: Server",
      status: "optimal",
    },
    {
      title: "Server Processing",
      value: getMetric(avg(apm.server_processing_ms), " ms"),
      subtitle: "Category: Server",
      status: "optimal",
    },
    {
      title: "Database Query",
      value: getMetric(avg(apm.db_query_ms), " ms"),
      subtitle: "Category: Database",
      status: "optimal",
    },
    {
      title: "Total Response Time",
      value: getMetric(avg(apm.total_response_ms), " ms"),
      subtitle: "Category: Overall",
      status: "optimal",
    },
  ];

  // --- APM Chart Data ---
  const chartData = [];
  if (
    apm.ttfb_ms &&
    apm.server_processing_ms &&
    apm.db_query_ms &&
    apm.total_response_ms
  ) {
    // Build a time-aligned array
    const len = Math.max(
      apm.ttfb_ms.length,
      apm.server_processing_ms.length,
      apm.db_query_ms.length,
      apm.total_response_ms.length
    );
    for (let i = 0; i < len; i++) {
      chartData.push({
        time: apm.ttfb_ms[i]?.timestamp
          ? new Date(apm.ttfb_ms[i].timestamp * 1000).toLocaleTimeString()
          : i,
        TTFB: apm.ttfb_ms[i]?.value,
        Server: apm.server_processing_ms[i]?.value,
        DB: apm.db_query_ms[i]?.value,
        Total: apm.total_response_ms[i]?.value,
      });
    }
  }

  // --- Mini charts for CPU, Memory, Errors ---
  const miniChart = (arr, label, color) =>
    Array.isArray(arr) && arr.length > 0 ? (
      <ResponsiveContainer width="100%" height={40}>
        <LineChart
          data={arr.map((d) => ({
            time: new Date(d.timestamp * 1000).toLocaleTimeString(),
            value: d.value,
          }))}
        >
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <span className="text-gray-400">N/A</span>
    );

  // --- Improved Empty State Detection ---
  const hasMetricsData =
    apmMetrics &&
    Object.values(apmMetrics).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fadeIn">
      {/* Debug Info (remove in production) */}
      {debugInfo && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          Debug: {debugInfo}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          className="btn btn-secondary flex items-center"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
            {service.displayName || service.name}
          </h1>
          <div className="text-xs text-gray-500 font-mono truncate">
            {service.url || service.endpoint || "-"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            As of {dataUtils.formatTimestamp(Date.now())}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-success">Start Monitoring</button>
          <button className="btn btn-primary">View Logs</button>
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <label className="text-sm text-gray-600 mr-2">Time Range:</label>
        <select
          className="input w-32"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="1h">Last 1 Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
        </select>
      </div>
      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col justify-between min-h-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg">STATUS</span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center text-sm text-gray-700">
              <ClockIcon className="w-4 h-4 mr-2" />
              Last Check:{" "}
              {service.last_scraped
                ? dataUtils.formatTimestamp(service.last_scraped * 1000)
                : "N/A"}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Response Time:{" "}
              {getMetric(service.metrics?.ttfb_ms || service.avg_latency, "ms")}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              HTTP Status: {service.metrics?.http_status || 200}
            </div>
          </div>
        </div>
        {/* System Metrics Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col justify-between min-h-[200px]">
          <div className="font-bold text-lg mb-2">SYSTEM METRICS</div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <CpuChipIcon className="w-4 h-4 mr-2" />
                CPU Usage:
              </span>
              <span className="font-bold">
                {getMetric(
                  service.metrics?.cpu_percent || service.cpu_percent,
                  "%"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <CpuChipIcon className="w-4 h-4 mr-2" />
                Memory Usage:
              </span>
              <span className="font-bold">
                {getMetric(
                  service.metrics?.memory_used_mb || service.memory_mb,
                  " MB"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <ClockIcon className="w-4 h-4 mr-2" />
                Tracking Since:
              </span>
              <span className="font-bold">
                {service.metrics?.uptime || service.uptime
                  ? `${service.metrics?.uptime || service.uptime} min`
                  : "N/A"}
              </span>
            </div>
            {/* Mini charts */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">CPU</div>
                {miniChart(apm.cpu_percent, "CPU", "#3b82f6")}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Memory</div>
                {miniChart(apm.memory_used_mb, "Memory", "#22c55e")}
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Errors</div>
                {miniChart(apm.errors_total, "Errors", "#ef4444")}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Performance Breakdown Cards */}
      {hasMetricsData ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {breakdownCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl shadow border border-gray-100 p-4 flex flex-col items-start"
            >
              <div className="text-xs text-gray-500 mb-1">{card.subtitle}</div>
              <div className="text-lg font-bold mb-1">{card.value}</div>
              <div className="text-xs text-gray-400">Status: {card.status}</div>
              <div className="mt-2 font-semibold text-gray-900">
                {card.title}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-xl shadow border border-gray-100 p-8 animate-fadeIn mt-8">
          <ChartBarIcon className="w-10 h-10 text-primary-300 mb-2" />
          <h3 className="text-lg font-bold mb-1 text-gray-900">
            {apmLoading ? "Loading Metrics..." : "No Metrics Yet"}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {apmLoading
              ? "Fetching performance data from the service..."
              : "This service has not reported any metrics yet. Once it starts sending data, performance breakdowns and trends will appear here automatically."}
          </p>
        </div>
      )}
      {/* Response Trends Chart */}
      <div className="mt-8 bg-white rounded-xl shadow border border-gray-100 p-6">
        <h2 className="text-lg font-bold mb-4">Response Time Breakdown (ms)</h2>
        {apmLoading ? (
          <div className="text-center text-gray-400 py-8">Loading chart...</div>
        ) : hasMetricsData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorTTFB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorServer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="TTFB"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#colorTTFB)"
                name="TTFB"
              />
              <Area
                type="monotone"
                dataKey="Server"
                stackId="1"
                stroke="#22c55e"
                fill="url(#colorServer)"
                name="Server Processing"
              />
              <Area
                type="monotone"
                dataKey="DB"
                stackId="1"
                stroke="#f59e0b"
                fill="url(#colorDB)"
                name="DB Query"
              />
              <Area
                type="monotone"
                dataKey="Total"
                stackId="1"
                stroke="#6366f1"
                fill="url(#colorTotal)"
                name="Total Response"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-400 py-8">
            {apmLoading
              ? "Loading time series data..."
              : "No time series data available for this service."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDetails;
