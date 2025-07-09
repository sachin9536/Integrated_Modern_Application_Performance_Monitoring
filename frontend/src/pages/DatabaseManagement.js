import React, { useEffect, useState } from "react";
import { apiService } from "../services/api";
import StatusBadge from "../components/StatusBadge";

const DatabaseManagement = () => {
  const [databases, setDatabases] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    connected: 0,
    disconnected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", uri: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchDatabases = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDatabases();
      setDatabases(data.databases);
      setCounts({
        total: data.total,
        connected: data.connected,
        disconnected: data.disconnected,
      });
    } catch (e) {
      setError("Failed to load databases");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDatabases();
    const interval = setInterval(fetchDatabases, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddDatabase = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await apiService.addDatabase(form);
      if (res.success) {
        setForm({ name: "", uri: "" });
        fetchDatabases();
      } else {
        setError(res.message || "Failed to add database");
      }
    } catch (e) {
      setError("Failed to add database");
    }
    setAdding(false);
  };

  const handleRemoveDatabase = async (name) => {
    if (!window.confirm(`Remove database '${name}'?`)) return;
    try {
      await apiService.removeDatabase(name);
      fetchDatabases();
    } catch (e) {
      setError("Failed to remove database");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-primary-700">
        Database Management
      </h1>
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Status Overview</h2>
          <div className="flex gap-8 mb-2">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {counts.total}
              </span>
              <div className="text-xs text-gray-500 uppercase">Total</div>
            </div>
            <div>
              <span className="text-2xl font-bold text-success-600">
                {counts.connected}
              </span>
              <div className="text-xs text-success-700 uppercase">
                Connected
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold text-danger-600">
                {counts.disconnected}
              </span>
              <div className="text-xs text-danger-700 uppercase">
                Disconnected
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4">Add New Database</h2>
          <form onSubmit={handleAddDatabase} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Database Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Enter database name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                MongoDB URI
              </label>
              <input
                type="text"
                name="uri"
                value={form.uri}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="mongodb://username:password@host:port/dbname"
                required
              />
            </div>
            {error && <div className="text-danger-600 text-sm">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={adding}
            >
              {adding ? "Adding..." : "Add Database"}
            </button>
          </form>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center text-gray-500">
            Loading databases...
          </div>
        ) : databases.length === 0 ? (
          <div className="col-span-2 text-center text-gray-500">
            No databases registered yet.
          </div>
        ) : (
          databases.map((db) => (
            <div
              key={db.name}
              className={`rounded-xl shadow-md border p-6 mb-2 bg-white flex flex-col gap-2 border-l-8 ${
                db.status === "connected"
                  ? "border-success-400"
                  : "border-danger-400"
              } animate-fadeIn`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg text-primary-700">
                  {db.name}
                </div>
                <StatusBadge
                  status={db.status === "connected" ? "healthy" : "error"}
                  showText
                />
              </div>
              <div className="text-xs text-gray-500 mb-1">{db.uri}</div>
              {db.status === "connected" ? (
                <div className="text-sm text-success-700 mb-1">
                  Response Time: {db.response_time_ms} ms
                  <br />
                  Host: {db.host || "-"} <br />
                  Port: {db.port || "-"}
                </div>
              ) : (
                <div className="text-sm text-danger-700 mb-1">
                  Error: {db.error || "Unknown error"}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                Last checked: {new Date(db.last_checked).toLocaleString()}
              </div>
              <button
                className="btn btn-danger btn-sm mt-2 self-end"
                onClick={() => handleRemoveDatabase(db.name)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DatabaseManagement;
