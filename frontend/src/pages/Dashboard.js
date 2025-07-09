import React, { useState, useEffect } from "react";
import {
  ServerIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { apiService, dataUtils } from "../services/api";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [data, setData] = useState({
    health: null,
    summary: null,
    performance: null,
    errorAnalysis: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // --- System Overview State ---
  const [systemOverview, setSystemOverview] = useState(null);
  const [sysLoading, setSysLoading] = useState(true);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [health, summary, performance, errorAnalysis] = await Promise.all([
        apiService.getHealth(),
        apiService.getSummary(),
        apiService.getPerformance(),
        apiService.getErrorAnalysis(),
      ]);

      setData({ health, summary, performance, errorAnalysis });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch system overview
  const fetchSystemOverview = async () => {
    try {
      setSysLoading(true);
      const overview = await apiService.getSystemOverview();
      setSystemOverview(overview);
    } catch (e) {
      setSystemOverview(null);
    } finally {
      setSysLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    fetchSystemOverview();
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchSystemOverview();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
    fetchSystemOverview();
    toast.success("Dashboard refreshed");
  };

  // --- System Overview Card ---
  const renderSystemOverview = () => {
    if (sysLoading) {
      return (
        <div className="flex-1 flex items-center justify-center h-24">
          Loading...
        </div>
      );
    }
    if (!systemOverview) {
      return (
        <div className="flex-1 flex items-center justify-center h-24 text-danger-600">
          Failed to load system overview
        </div>
      );
    }
    // Determine health color
    const isHealthy =
      systemOverview.active_services === systemOverview.total_applications &&
      systemOverview.system?.every(
        (sys) => sys.status === "up" || sys.status === "connected"
      );
    const sysColor = isHealthy
      ? "bg-success-50 border-success-200"
      : "bg-danger-50 border-danger-200";
    const dbColor =
      systemOverview.system?.find((sys) => sys.name === "MongoDB")?.status ===
      "connected"
        ? "bg-success-50 border-success-200"
        : "bg-danger-50 border-danger-200";
    const sysStatus = isHealthy ? "Healthy" : "Issues";
    const dbStatus =
      systemOverview.system?.find((sys) => sys.name === "MongoDB")?.status ===
      "connected"
        ? "Connected"
        : "Disconnected";
    return (
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* System Overview */}
        <div
          className={`flex-1 rounded-2xl p-6 shadow-md border ${sysColor} flex flex-col justify-between min-w-[250px] animate-fadeIn`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl flex items-center">
              <ServerIcon className="w-6 h-6 mr-2 text-primary-600" /> System
              Overview
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase ml-2 ${
                isHealthy
                  ? "bg-success-100 text-success-700"
                  : "bg-danger-100 text-danger-700"
              }`}
            >
              {isHealthy ? (
                <ServerIcon className="w-4 h-4 mr-1 text-success-500" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-danger-500" />
              )}{" "}
              {sysStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-2">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">
                {systemOverview.total_applications}
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Total Apps
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-success-600">
                {systemOverview.active_services}
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Active
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-danger-600">
                {systemOverview.inactive_services}
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Inactive
              </span>
            </div>
            <div className="flex flex-col items-center">
              {/* Placeholder for avg response time */}
              <span className="text-2xl font-bold text-gray-900">318ms</span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Avg Response
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end mt-2 text-xs text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
        {/* Database Connections */}
        <div
          className={`flex-1 rounded-2xl p-6 shadow-md border ${dbColor} flex flex-col justify-between min-w-[250px] animate-fadeIn`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xl flex items-center">
              <ChartBarIcon className="w-6 h-6 mr-2 text-primary-600" />{" "}
              System Status
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase ml-2 ${
                systemOverview.system?.find(sys => sys.name === "MongoDB")?.status === "connected"
                  ? "bg-success-100 text-success-700"
                  : "bg-danger-100 text-danger-700"
              }`}
            >
              {systemOverview.system?.find(sys => sys.name === "MongoDB")?.status === "connected" ? (
                <ServerIcon className="w-4 h-4 mr-1 text-success-500" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 mr-1 text-danger-500" />
              )}{" "}
              {dbStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-2">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">
                {systemOverview.system?.length || 0}
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Total Systems
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-success-600">
                {
                  systemOverview.system?.filter(
                    (sys) => sys.status === "up" || sys.status === "connected"
                  ).length || 0
                }
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Healthy
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-danger-600">
                {
                  systemOverview.system?.filter(
                    (sys) => sys.status !== "up" && sys.status !== "connected"
                  ).length || 0
                }
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                Issues
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  systemOverview.system?.find(sys => sys.name === "MongoDB")?.status === "connected"
                    ? "bg-success-100 text-success-700"
                    : "bg-danger-100 text-danger-700"
                }`}
              >
                {systemOverview.system?.find(sys => sys.name === "MongoDB")?.status?.toUpperCase() ||
                  "UNKNOWN"}
              </span>
              <span className="uppercase text-xs text-gray-500 mt-1">
                MongoDB
              </span>
            </div>
          </div>
          <div className="flex items-center justify-end mt-2 text-xs text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  // --- No Data Yet State ---
  const isEmpty =
    (!data.summary?.summary?.total || data.summary.summary.total === 0) &&
    (!data.performance?.throughput?.total_requests ||
      data.performance.throughput.total_requests === 0) &&
    (!systemOverview || systemOverview.total_applications === 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* No Data Yet State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-96 text-center bg-white rounded-xl shadow-md border border-gray-100 p-12 animate-fadeIn">
          <ChartBarIcon className="w-16 h-16 text-primary-300 mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">No Data Yet</h2>
          <p className="text-gray-600 mb-4 max-w-xl mx-auto">
            Welcome to AppVital! To get started, register your first service or
            application using the{" "}
            <span className="font-semibold">"Register New Application"</span>{" "}
            form on the Services page. Once registered, metrics and logs will
            appear here automatically.
          </p>
          <a
            href="/services"
            className="btn btn-primary inline-flex items-center gap-2 mt-2"
          >
            <ServerIcon className="w-5 h-5" /> Register a Service
          </a>
        </div>
      )}
      {/* System Overview & Database Connections */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Application Monitor
            </h1>
            <p className="text-gray-600">
              Comprehensive application performance and health monitoring
              dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={handleRefresh}>
              Refresh
            </button>
            <button className="btn btn-success">Start Monitoring</button>
          </div>
        </div>
        {renderSystemOverview()}
      </div>
      {/* Header */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-xs rounded-xl shadow-sm px-6 py-4 mb-4 border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            System overview and key metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-base text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn btn-primary shadow-md hover:scale-105 transition-transform"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* System Status */}
      {data.health && (
        <div className="card mb-6">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title text-xl font-bold flex items-center">
              <span className="mr-2">System Status</span>
              <StatusBadge status={data.health.status} size="lg" />
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {Object.entries(data.health.components || {}).map(
              ([component, status]) => (
                <div
                  key={component}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm"
                >
                  <span className="font-medium capitalize text-gray-700 flex items-center">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          status === "healthy"
                            ? "#22c55e"
                            : status === "warning"
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    ></span>
                    {component}
                  </span>
                  <StatusBadge status={status} />
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Logs"
          value={data.summary?.summary?.total || 0}
          subtitle="All log entries"
          icon={DocumentTextIcon}
          color="primary"
          loading={loading}
        />

        <MetricCard
          title="Total Errors"
          value={data.summary?.summary?.errors || 0}
          subtitle="Error count"
          icon={ExclamationTriangleIcon}
          color="danger"
          loading={loading}
        />

        <MetricCard
          title="Success Rate"
          value={data.performance?.throughput?.success_rate || "0%"}
          subtitle="Request success"
          icon={ChartBarIcon}
          color="success"
          loading={loading}
        />

        <MetricCard
          title="Active Services"
          value={
            data.health?.components
              ? Object.keys(data.health.components).length
              : 0
          }
          subtitle="Running services"
          icon={ServerIcon}
          color="primary"
          loading={loading}
        />
      </div>

      {/* Performance Metrics */}
      {data.performance && (
        <div className="card mt-8">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title text-xl font-bold">
              Performance Metrics
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {dataUtils.formatDuration(
                  data.performance.latency_analysis?.average_ms / 1000
                )}
              </div>
              <div className="text-sm text-gray-500">Average Latency</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {dataUtils.formatDuration(
                  data.performance.latency_analysis?.p95_ms / 1000
                )}
              </div>
              <div className="text-sm text-gray-500">P95 Latency</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.performance.throughput?.total_requests || 0}
              </div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.performance.throughput?.error_rate || "0%"}
              </div>
              <div className="text-sm text-gray-500">Error Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Anomalies */}
      {data.summary?.anomalies && data.summary.anomalies.length > 0 && (
        <div className="card mt-8">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title text-xl font-bold flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning-600 mr-2" />
              Recent Anomalies
            </h2>
            <StatusBadge status="warning" />
          </div>

          <div className="space-y-3 mt-2">
            {data.summary.anomalies.slice(0, 5).map((anomaly, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-warning-50 rounded-lg border border-warning-200 shadow-sm"
              >
                <ExclamationTriangleIcon className="w-5 h-5 text-warning-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-warning-800">
                    {anomaly}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Summary */}
      {data.errorAnalysis && (
        <div className="card mt-8">
          <div className="card-header flex items-center justify-between">
            <h2 className="card-title text-xl font-bold">Error Analysis</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Error Types
              </h3>
              <div className="space-y-2">
                {Object.entries(
                  data.errorAnalysis.error_summary?.error_types || {}
                ).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {type.replace("_", " ")}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Service Errors
              </h3>
              <div className="space-y-2">
                {Object.entries(data.errorAnalysis.service_errors || {}).map(
                  ([service, count]) => (
                    <div
                      key={service}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm text-gray-600 capitalize">
                        {service.replace("_", " ")}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
