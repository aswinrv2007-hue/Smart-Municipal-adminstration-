import React, { useState } from "react";
import { Shield, Radio, AlertTriangle, RefreshCw, Zap, User } from "lucide-react";

export default function Header({
  alerts = [],
  onRefresh,
  isRefreshing,
  onOpenSimulator,
  activeProfile,
  setActiveProfile,
  staffList = []
}) {
  const criticalCount = alerts.filter(
    (a) => a.priority === "CRITICAL" && a.status === "ACTIVE"
  ).length;
  const highCount = alerts.filter(
    (a) => a.priority === "HIGH" && a.status === "ACTIVE"
  ).length;

  const topCriticalAlert = alerts.find(
    (a) => (a.priority === "CRITICAL" || a.priority === "HIGH") && a.status === "ACTIVE"
  );

  return (
    <>
      <header className="header-bar" id="civic-header">
        <div className="header-inner">
          <div className="brand-section">
            <div className="brand-logo" id="header-brand-logo">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="brand-title">Smart Municipal AI Agent</h1>
              <div className="brand-subtitle">Civic Satellite Operations & Grievance Center</div>
            </div>
          </div>

          <div className="header-status-group">
            {/* User Profile Selector Chip */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-surface-elevated)", padding: "0.3rem 0.65rem", borderRadius: "var(--radius-full)", border: "1px solid var(--border-subtle)" }}>
              <img
                src={activeProfile?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop"}
                alt="Profile"
                style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }}
              />
              <select
                className="profile-switcher-select"
                style={{ background: "transparent", border: "none", color: "#f8fafc", fontSize: "0.78rem", outline: "none", cursor: "pointer", fontWeight: 600 }}
                value={activeProfile?.id || ""}
                onChange={(e) => {
                  const found = staffList.find((s) => s.id === e.target.value);
                  if (found) setActiveProfile(found);
                }}
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id} style={{ background: "#0f172a", color: "#fff" }}>
                    {s.name} ({s.department.replace(" Department", "")})
                  </option>
                ))}
              </select>
            </div>

            {/* IoT Simulator Drawer Trigger */}
            <button
              className="btn btn-secondary btn-sm"
              id="open-iot-simulator-btn"
              onClick={onOpenSimulator}
              title="Open LoRa Telemetry & Scenario Injector"
            >
              <Zap size={14} color="#00f0ff" />
              <span>IoT Simulator</span>
            </button>

            {/* Sync Button */}
            <button
              className="btn btn-secondary btn-sm"
              id="header-refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Telemetry and Complaints"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? "Syncing..." : "Sync"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Alert Marquee */}
      {topCriticalAlert && (
        <div className="emergency-ticker" id="emergency-ticker-bar">
          <div className="ticker-content">
            <AlertTriangle size={16} color="#ef4444" />
            <span>
              <strong>URGENT MUNICIPAL ALERT:</strong> [{topCriticalAlert.priority}] {topCriticalAlert.problem_type} at {topCriticalAlert.location} — Action: {topCriticalAlert.recommended_action}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {criticalCount > 0 && (
              <span className="badge badge-critical">{criticalCount} Critical</span>
            )}
            {highCount > 0 && (
              <span className="badge badge-high">{highCount} High Priority</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
