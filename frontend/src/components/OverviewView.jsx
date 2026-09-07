import React from "react";
import {
  Activity,
  Trash2,
  Waves,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send
} from "lucide-react";

export default function OverviewView({
  summary = {},
  sensors = [],
  alerts = [],
  complaints = [],
  setActiveTab
}) {
  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE" || a.status === "ACKNOWLEDGED");
  const recentComplaints = complaints.slice(0, 5);

  const getHealthBadge = (score) => {
    if (score >= 90) return <span className="badge badge-low">Optimal ({score}%)</span>;
    if (score >= 75) return <span className="badge badge-medium">Moderate ({score}%)</span>;
    return <span className="badge badge-critical">Attention Needed ({score}%)</span>;
  };

  return (
    <div id="overview-view-container">
      {/* Top Level KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" id="kpi-health-score">
          <div>
            <div className="kpi-title">City Infrastructure Integrity</div>
            <div className="kpi-value" style={{ color: "#00f0ff" }}>
              {summary.city_infrastructure_health_score || 90.0}%
            </div>
            <div className="kpi-subtext">
              {summary.online_sensors || sensors.length} of {summary.total_sensors || sensors.length} IoT nodes healthy
            </div>
          </div>
          <div className="kpi-icon" style={{ background: "rgba(0, 240, 255, 0.12)", color: "#00f0ff" }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="kpi-card" id="kpi-active-alerts">
          <div>
            <div className="kpi-title">Active Municipal Alerts</div>
            <div className="kpi-value" style={{ color: summary.critical_alerts > 0 ? "#ef4444" : "#f97316" }}>
              {activeAlerts.length}
            </div>
            <div className="kpi-subtext">
              <strong style={{ color: "#ef4444" }}>{summary.critical_alerts || 0} Critical</strong> | {summary.high_alerts || 0} High Priority
            </div>
          </div>
          <div className="kpi-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="kpi-card" id="kpi-sla-rate">
          <div>
            <div className="kpi-title">Citizen Grievance SLA</div>
            <div className="kpi-value" style={{ color: "#10b981" }}>
              {summary.resolution_sla_rate || 80.0}%
            </div>
            <div className="kpi-subtext">
              {summary.resolved_complaints || 0} of {summary.total_complaints || complaints.length} resolved on schedule
            </div>
          </div>
          <div className="kpi-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="kpi-card" id="kpi-infrastructure-averages">
          <div>
            <div className="kpi-title">Avg Municipal Load</div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-dim)" }}>Bins</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{summary.avg_bin_fill_pct || 69}%</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-dim)" }}>Drains</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{summary.avg_drainage_level_pct || 49}%</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-dim)" }}>Tanks</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{summary.avg_water_tank_pct || 56}%</div>
              </div>
            </div>
            <div className="kpi-subtext">Telemetry aggregated across 4 wards</div>
          </div>
          <div className="kpi-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#a855f7" }}>
            <Waves size={24} />
          </div>
        </div>
      </div>

      {/* Two Column Grid: Active Alerts & Recent Complaints */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1.5rem" }}>
        
        {/* Active Alerts Panel */}
        <div className="glass-panel" id="overview-alerts-panel">
          <div className="panel-header">
            <div className="panel-title">
              <AlertTriangle size={20} />
              <span>Real-Time Incident Triage</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              id="view-all-alerts-btn"
              onClick={() => setActiveTab("alerts")}
            >
              <span>View All ({activeAlerts.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {activeAlerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
              <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
              <div>All infrastructure nodes are operating within normal parameters.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {activeAlerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    background: "var(--bg-surface-elevated)",
                    border: `1px solid ${
                      alert.priority === "CRITICAL"
                        ? "rgba(239, 68, 68, 0.5)"
                        : "rgba(249, 115, 22, 0.4)"
                    }`,
                    borderRadius: "var(--radius-md)",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        className={`badge ${
                          alert.priority === "CRITICAL" ? "badge-critical" : "badge-high"
                        }`}
                      >
                        {alert.priority}
                      </span>
                      <strong style={{ fontSize: "0.88rem" }}>{alert.problem_type}</strong>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-dim)" }}>
                      {alert.sensor_id || "Civic Sensor"}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    📍 {alert.location} | Reading: <strong>{alert.current_reading}</strong>
                  </div>

                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "#93c5fd",
                      background: "rgba(59, 130, 246, 0.1)",
                      padding: "0.3rem 0.6rem",
                      borderRadius: "var(--radius-sm)"
                    }}
                  >
                    Action: {alert.recommended_action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Citizen Complaints Panel */}
        <div className="glass-panel" id="overview-complaints-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Send size={20} />
              <span>Recent Citizen Grievances</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              id="view-all-complaints-btn"
              onClick={() => setActiveTab("citizen")}
            >
              <span>Citizen Portal</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {recentComplaints.map((c) => (
              <div
                key={c.id}
                style={{
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.85rem 1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--color-primary)" }}>
                      {c.id}
                    </span>
                    <span className="badge badge-medium" style={{ fontSize: "0.68rem" }}>
                      {c.category}
                    </span>
                    {c.duplicate_status === "DUPLICATE" && (
                      <span className="badge badge-high" style={{ fontSize: "0.65rem" }}>
                        Duplicate (Ref: {c.parent_complaint_id})
                      </span>
                    )}
                  </div>
                  <span
                    className={`badge ${
                      c.status === "RESOLVED"
                        ? "badge-low"
                        : c.status === "IN_PROGRESS"
                        ? "badge-high"
                        : "badge-medium"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                  {c.main_problem}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)", marginTop: "0.25rem" }}>
                  📍 {c.location} &bull; Dept: {c.responsible_department}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
