import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Filter,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  X
} from "lucide-react";
import { api } from "../api";

export default function AlertsView({ alerts = [], onAlertUpdated }) {
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [dispatchingAlert, setDispatchingAlert] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAlerts = alerts.filter((a) => {
    if (filterPriority !== "all" && a.priority !== filterPriority) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const handleAcknowledge = async (alertId) => {
    try {
      await api.updateAlertAction(alertId, "ACKNOWLEDGE");
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error("Acknowledge failed", err);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchingAlert || !teamName) return;
    setIsSubmitting(true);
    try {
      await api.updateAlertAction(dispatchingAlert.id, "DISPATCH", teamName);
      setDispatchingAlert(null);
      setTeamName("");
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error("Dispatch failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolvingAlert || !resolutionNotes) return;
    setIsSubmitting(true);
    try {
      await api.updateAlertAction(resolvingAlert.id, "RESOLVE", null, resolutionNotes);
      setResolvingAlert(null);
      setResolutionNotes("");
      if (onAlertUpdated) onAlertUpdated();
    } catch (err) {
      console.error("Resolve failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="alerts-view-container">
      {/* Alert Filters & Status */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem", padding: "1rem 1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className={`btn btn-sm ${filterPriority === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterPriority("all")}
            >
              All Priorities ({alerts.length})
            </button>
            <button
              className={`btn btn-sm ${filterPriority === "CRITICAL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterPriority("CRITICAL")}
            >
              Critical ({alerts.filter((a) => a.priority === "CRITICAL").length})
            </button>
            <button
              className={`btn btn-sm ${filterPriority === "HIGH" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterPriority("HIGH")}
            >
              High ({alerts.filter((a) => a.priority === "HIGH").length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              className="form-select"
              style={{ width: "auto", padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
          <CheckCircle2 size={40} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
          <h3>No Matching Alerts</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            No incident matches current priority or status filters.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredAlerts.map((alert) => {
            const isCritical = alert.priority === "CRITICAL";
            const isResolved = alert.status === "RESOLVED";

            return (
              <div
                key={alert.id}
                className="glass-panel"
                id={`alert-card-${alert.id}`}
                style={{
                  borderLeft: `4px solid ${isCritical ? "#ef4444" : "#f97316"}`,
                  padding: "1.25rem",
                  opacity: isResolved ? 0.75 : 1
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className={`badge ${isCritical ? "badge-critical" : "badge-high"}`}>
                        {alert.priority}
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--color-primary)" }}>
                        {alert.id}
                      </span>
                      <span className="badge badge-medium" style={{ fontSize: "0.68rem" }}>
                        {alert.status}
                      </span>
                      {alert.assigned_team && (
                        <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>
                          Team: {alert.assigned_team}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: "1.1rem", marginTop: "0.4rem" }}>
                      {alert.problem_type}
                    </h3>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                      <Clock size={12} style={{ display: "inline", marginRight: "3px" }} />
                      Detected: {new Date(alert.detection_time).toLocaleTimeString()} ({new Date(alert.detection_time).toLocaleDateString()})
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                      Reading: <strong>{alert.current_reading}</strong> | Node: <strong>{alert.sensor_id || "Civic Incident"}</strong>
                    </div>
                  </div>
                </div>

                {/* Location & Dept */}
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: "0.6rem 0" }}>
                  📍 <strong>Location:</strong> {alert.location} &bull; 🏢 <strong>Dept:</strong> {alert.responsible_department}
                </div>

                {/* Recommended Municipal Action */}
                <div
                  style={{
                    background: "var(--bg-surface-elevated)",
                    borderLeft: "3px solid var(--color-primary)",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                    fontSize: "0.82rem",
                    color: "#f1f5f9"
                  }}
                >
                  <strong style={{ color: "var(--color-primary)" }}>Recommended Action: </strong>
                  {alert.recommended_action}
                </div>

                {alert.resolution_notes && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#86efac", background: "rgba(16, 185, 129, 0.1)", padding: "0.4rem 0.8rem", borderRadius: "4px" }}>
                    ✓ <strong>Resolution:</strong> {alert.resolution_notes}
                  </div>
                )}

                {/* Action Buttons for Municipal Staff */}
                {!isResolved && (
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                    {alert.status === "ACTIVE" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        <UserCheck size={14} />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.status !== "DISPATCHED" && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setDispatchingAlert(alert);
                          setTeamName(alert.assigned_team || "Rapid Response Squad A");
                        }}
                      >
                        <Send size={14} />
                        <span>Dispatch Team</span>
                      </button>
                    )}

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setResolvingAlert(alert)}
                    >
                      <CheckCircle size={14} />
                      <span>Resolve Alert</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchingAlert && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
          }}
          onClick={() => setDispatchingAlert(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "450px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <h3>Dispatch Municipal Team</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setDispatchingAlert(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleDispatch}>
              <div className="form-group">
                <label className="form-label">Alert Reference</label>
                <div style={{ fontSize: "0.85rem", color: "var(--color-primary)" }}>
                  {dispatchingAlert.id} - {dispatchingAlert.problem_type}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Field Unit / Team</label>
                <input
                  type="text"
                  className="form-input"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Sanitation Crew 4, Dewatering Unit 1"
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDispatchingAlert(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingAlert && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
          }}
          onClick={() => setResolvingAlert(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "450px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <h3>Mark Alert as Resolved</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setResolvingAlert(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleResolve}>
              <div className="form-group">
                <label className="form-label">Alert</label>
                <div style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                  {resolvingAlert.problem_type} at {resolvingAlert.location}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Resolution Notes / Action Taken</label>
                <textarea
                  className="form-textarea"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe maintenance action completed (e.g. Bin cleared, drain culvert cleared of plastic debris)."
                  required
                ></textarea>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResolvingAlert(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
                  Resolve & Close Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
