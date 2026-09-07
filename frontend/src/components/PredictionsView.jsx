import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  MapPin,
  RefreshCw
} from "lucide-react";
import { api } from "../api";

export default function PredictionsView() {
  const [predictions, setPredictions] = useState([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const res = await api.getPredictions();
      setPredictions(res.predictions || []);
      setDisclaimer(res.disclaimer || "");
    } catch (err) {
      console.error("Failed to load predictions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const filtered = predictions.filter((p) => {
    if (filterType === "all") return true;
    return p.type === filterType;
  });

  const getConfidenceColor = (score) => {
    if (score >= 85) return "#10b981";
    if (score >= 70) return "#f59e0b";
    return "#f97316";
  };

  return (
    <div id="predictions-view-container">
      {/* Overview Banner */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-header">
          <div className="panel-title">
            <TrendingUp size={22} color="#a855f7" />
            <span>AI Predictive Analytics & Early Warning Infrastructure</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadPredictions}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Recalculate Trends</span>
          </button>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
          The AI Agent continuously examines historical time-series velocity, sensor telemetry slopes, and spatial complaint clustering to forecast potential municipal failures before they impact citizens.
        </p>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button
            className={`btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("all")}
          >
            All Projections ({predictions.length})
          </button>
          <button
            className={`btn btn-sm ${filterType === "BIN_FULL_PREDICTION" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("BIN_FULL_PREDICTION")}
          >
            Bin Saturation
          </button>
          <button
            className={`btn btn-sm ${filterType === "DRAINAGE_OVERFLOW_PREDICTION" || filterType === "DRAINAGE_BLOCKAGE_PREDICTION" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("DRAINAGE_OVERFLOW_PREDICTION")}
          >
            Drainage & Blockages
          </button>
          <button
            className={`btn btn-sm ${filterType === "TANK_DEPLETION_PREDICTION" || filterType === "TANK_OVERFLOW_PREDICTION" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("TANK_DEPLETION_PREDICTION")}
          >
            Water Tanks
          </button>
          <button
            className={`btn btn-sm ${filterType === "REPEATED_INFRASTRUCTURE_HOTSPOT" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("REPEATED_INFRASTRUCTURE_HOTSPOT")}
          >
            City Hotspots
          </button>
          <button
            className={`btn btn-sm ${filterType === "SENSOR_FAILURE_PREDICTION" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("SENSOR_FAILURE_PREDICTION")}
          >
            Hardware Degradation
          </button>
        </div>
      </div>

      {/* Predictions Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <CheckCircle size={40} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
          <h3>No Immediate Threshold Breaches Projected</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            Telemetry trends indicate stable fill and drain dynamics across all municipal wards.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.25rem" }}>
          {filtered.map((item, index) => {
            const confScore = item.confidence_score || 80;
            const confColor = getConfidenceColor(confScore);

            return (
              <div
                key={index}
                className="prediction-card"
                id={`prediction-card-${index}`}
                style={{
                  borderLeft: `4px solid ${
                    item.priority === "CRITICAL"
                      ? "#ef4444"
                      : item.priority === "HIGH"
                      ? "#f97316"
                      : "#a855f7"
                  }`
                }}
              >
                <div className="prediction-header">
                  <div>
                    {item.sensor_id && (
                      <span className="sensor-id-tag" style={{ marginRight: "0.5rem" }}>
                        {item.sensor_id}
                      </span>
                    )}
                    <span
                      className={`badge ${
                        item.priority === "CRITICAL"
                          ? "badge-critical"
                          : item.priority === "HIGH"
                          ? "badge-high"
                          : "badge-medium"
                      }`}
                      style={{ fontSize: "0.68rem" }}
                    >
                      {item.priority || "MEDIUM"}
                    </span>
                    <h3 style={{ fontSize: "1rem", marginTop: "0.4rem" }}>{item.title}</h3>
                  </div>
                </div>

                {/* Prediction Statement */}
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f8fafc", margin: "0.4rem 0" }}>
                  🔮 {item.prediction}
                </div>

                {/* Reason */}
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  <strong>Analysis Basis:</strong> {item.reason}
                </div>

                {/* Confidence Meter */}
                <div className="confidence-bar-container">
                  <div className="confidence-label-row">
                    <span>AI Confidence Probability</span>
                    <strong style={{ color: confColor }}>{item.confidence_level}</strong>
                  </div>
                  <div className="progress-track" style={{ height: "6px" }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${confScore}%`,
                        backgroundColor: confColor
                      }}
                    ></div>
                  </div>
                </div>

                {/* Recommended Preventive Action */}
                <div className="recommendation-box">
                  <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--color-primary)", fontWeight: 700 }}>
                    Recommended Municipal Action:
                  </div>
                  <div style={{ marginTop: "0.2rem", color: "#e2e8f0" }}>
                    {item.recommended_action}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mandatory Non-Deterministic AI Disclaimer */}
      <div className="disclaimer-text">
        <Info size={14} style={{ display: "inline", marginRight: "4px", verticalAlign: "text-bottom" }} />
        {disclaimer || "Notice: AI predictions are probabilistic projections based on historical telemetry trends and not guaranteed facts."}
      </div>
    </div>
  );
}
