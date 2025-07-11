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

  const isDown = service.status !== "healthy" && service.status !== "warning";
  const statusLabel = isDown ? "DOWN" : "UP";
  const statusColor = isDown
    ? "bg-danger-100 text-danger-700"
    : "bg-success-100 text-success-700";

  // Real metrics
  const metrics = service.metrics || {};
  const avgLatencyMs = metrics.avg_latency ? metrics.avg_latency * 1000 : null;
  const errorRate =
    metrics.errors_total &&
    metrics.http_requests_total &&
    Number(metrics.http_requests_total) > 0
      ? ((metrics.errors_total / metrics.http_requests_total) * 100).toFixed(2)
      : null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fadeIn">
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
      {/* Main Metrics Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
              Response Time: {getMetric(avgLatencyMs, " ms")}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <DocumentTextIcon className="w-4 h-4 mr-2" />
              HTTP Status: 200
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
                {getMetric(metrics.cpu_percent, "%")}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <CpuChipIcon className="w-4 h-4 mr-2" />
                Memory Usage:
              </span>
              <span className="font-bold">
                {getMetric(metrics.memory_used_mb, " MB")}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Total Requests:
              </span>
              <span className="font-bold">
                {getMetric(metrics.http_requests_total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                Errors:
              </span>
              <span className="font-bold">
                {getMetric(metrics.errors_total)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span className="flex items-center">
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Error Rate:
              </span>
              <span className="font-bold">
                {errorRate !== null ? (
                  `${errorRate}%`
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
