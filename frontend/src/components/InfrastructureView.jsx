import React, { useState } from "react";
import {
  Trash2,
  Waves,
  Droplets,
  Battery,
  Wifi,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Clock,
  ExternalLink,
  X
} from "lucide-react";
import { api } from "../api";

export default function InfrastructureView({ sensors = [], onTelemetryUpdate }) {
  const [filterType, setFilterType] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [selectedSensorHistory, setSelectedSensorHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filteredSensors = sensors.filter((s) => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterWard !== "all" && s.ward !== filterWard) return false;
    return true;
  });

  const getProgressColor = (reading, type) => {
    if (type === "garbage_bin") {
      if (reading >= 95) return "red";
      if (reading >= 85) return "orange";
      if (reading >= 70) return "amber";
      return "green";
    }
    if (type === "drainage") {
      if (reading >= 90) return "red";
      if (reading >= 75) return "orange";
      if (reading >= 50) return "amber";
      return "green";
    }
    if (type === "water_tank") {
      if (reading <= 10 || reading >= 95) return "red";
      if (reading <= 25 || reading >= 85) return "amber";
      return "green";
    }
    return "green";
  };

  const getStatusBadge = (status, condition) => {
    if (status === "CRITICAL") return <span className="badge badge-critical">{condition}</span>;
    if (status === "WARNING" || status === "FAULT") return <span className="badge badge-high">{condition}</span>;
    if (condition === "Nearly Full" || condition === "Low Level" || condition === "Rising Water Level") {
      return <span className="badge badge-medium">{condition}</span>;
    }
    return <span className="badge badge-online">{condition}</span>;
  };

  const viewHistory = async (sensor) => {
    setLoadingHistory(true);
    try {
      const res = await api.getSensorHistory(sensor.id, 15);
      setSelectedSensorHistory({
        sensor,
        history: res.history || []
      });
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div id="infrastructure-view-container">
      {/* Controls & Filters */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem", padding: "1rem 1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              id="filter-all-sensors"
              className={`btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("all")}
            >
              All Nodes ({sensors.length})
            </button>
            <button
              id="filter-garbage-bins"
              className={`btn btn-sm ${filterType === "garbage_bin" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("garbage_bin")}
            >
              <Trash2 size={14} />
              <span>Garbage Bins ({sensors.filter((s) => s.type === "garbage_bin").length})</span>
            </button>
            <button
              id="filter-drainage"
              className={`btn btn-sm ${filterType === "drainage" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("drainage")}
            >
              <Waves size={14} />
              <span>Drainage Systems ({sensors.filter((s) => s.type === "drainage").length})</span>
            </button>
            <button
              id="filter-water-tanks"
              className={`btn btn-sm ${filterType === "water_tank" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterType("water_tank")}
            >
              <Droplets size={14} />
              <span>Water Reservoirs ({sensors.filter((s) => s.type === "water_tank").length})</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-dim)" }}>Filter Ward:</span>
            <select
              id="ward-selector"
              className="form-select"
              style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
            >
              <option value="all">All Wards</option>
              <option value="Ward 1">Ward 1 - Downtown</option>
              <option value="Ward 2">Ward 2 - Commercial</option>
              <option value="Ward 3">Ward 3 - Healthcare Zone</option>
              <option value="Ward 4">Ward 4 - Residential/Tech</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="sensors-grid" id="sensors-grid">
        {filteredSensors.map((sensor) => {
          const isCritical = sensor.status === "CRITICAL";
          const isWarning = sensor.status === "WARNING" || sensor.status === "FAULT";
          const progressClass = getProgressColor(sensor.current_reading, sensor.type);

          return (
            <div
              key={sensor.id}
              id={`sensor-card-${sensor.id}`}
              className={`sensor-card ${isCritical ? "critical" : isWarning ? "warning" : ""}`}
            >
              <div>
                <div className="sensor-header">
                  <div>
                    <span className="sensor-id-tag">{sensor.id}</span>
                    <h3 className="sensor-name">{sensor.name}</h3>
                    <div className="sensor-location">
                      <MapPin size={12} />
                      <span>{sensor.location}</span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(sensor.status, sensor.condition_label)}
                  </div>
                </div>

                {/* Level / Reading Gauge */}
                <div className="sensor-metric-display">
                  <div className="metric-row">
                    <span className="metric-label">
                      {sensor.type === "garbage_bin"
                        ? "Fill Level Capacity"
                        : sensor.type === "drainage"
                        ? "Culvert Water Level"
                        : "Reservoir Storage Level"}
                    </span>
                    <span className="metric-reading">
                      {sensor.current_reading}
                      <span style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>{sensor.unit}</span>
                    </span>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${progressClass}`}
                      style={{ width: `${Math.min(100, Math.max(0, sensor.current_reading))}%` }}
                    ></div>
                  </div>

                  {/* Flow Rate for Drainage or Water Tanks */}
                  {(sensor.type === "drainage" || sensor.type === "water_tank") && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      <span>Flow Velocity / Rate:</span>
                      <strong style={{ color: "#00f0ff" }}>{sensor.flow_rate} L/sec</strong>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)", marginBottom: "0.75rem" }}>
                  Responsible: <strong style={{ color: "var(--color-text-muted)" }}>{sensor.responsible_department}</strong>
                </div>
              </div>

              <div>
                <div className="sensor-telemetry-meta">
                  <div className="meta-item">
                    <span className="meta-label">
                      <Battery size={10} style={{ display: "inline", marginRight: "2px" }} /> Battery
                    </span>
                    <span className="meta-val">{sensor.battery_level}%</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      <Wifi size={10} style={{ display: "inline", marginRight: "2px" }} /> LoRa RSSI
                    </span>
                    <span className="meta-val">{sensor.rssi} dBm</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">
                      <Clock size={10} style={{ display: "inline", marginRight: "2px" }} /> Telemetry
                    </span>
                    <span className="meta-val">Online</span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: "100%", marginTop: "0.75rem" }}
                  onClick={() => viewHistory(sensor)}
                >
                  <ExternalLink size={13} />
                  <span>Telemetry Trend</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Telemetry History Modal */}
      {selectedSensorHistory && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
          onClick={() => setSelectedSensorHistory(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "600px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <span className="sensor-id-tag">{selectedSensorHistory.sensor.id}</span>
                <h3 style={{ marginTop: "0.2rem" }}>{selectedSensorHistory.sensor.name} - Telemetry Series</h3>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-dim)" }}>
                  {selectedSensorHistory.sensor.location} ({selectedSensorHistory.sensor.responsible_department})
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedSensorHistory(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Reading</th>
                    <th>Flow Rate</th>
                    <th>Battery</th>
                    <th>Signal (RSSI)</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSensorHistory.history.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <strong>{h.reading}%</strong>
                      </td>
                      <td>{h.flow_rate} L/s</td>
                      <td>{h.battery_level}%</td>
                      <td>{h.rssi} dBm</td>
                      <td>
                        <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>
                          {h.condition_label || "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
