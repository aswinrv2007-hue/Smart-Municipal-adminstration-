import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  Download,
  Building,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Layers
} from "lucide-react";
import { api } from "../api";

export default function MunicipalReportsView() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.getMunicipalReport();
        setReport(res);
      } catch (err) {
        console.error("Failed to load report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !report) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "3rem" }}>
        <h3>Compiling Municipal Intelligence Report...</h3>
      </div>
    );
  }

  return (
    <div id="municipal-report-container">
      {/* Report Header Bar */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-header">
          <div>
            <span className="badge badge-low">Official Municipal Record</span>
            <h2 style={{ fontSize: "1.3rem", marginTop: "0.25rem" }}>
              Comprehensive Municipal Infrastructure & Civic Operations Report
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              {report.municipality} &bull; Document ID: <strong>{report.report_id}</strong> &bull; Generated: {new Date(report.generated_at).toLocaleString()}
            </div>
          </div>
          <div>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={15} />
              <span>Print / Export PDF</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div style={{ background: "var(--bg-surface-elevated)", borderLeft: "4px solid var(--color-primary)", padding: "1rem", borderRadius: "var(--radius-md)", margin: "1rem 0" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-primary)" }}>
            AI Executive Intelligence Briefing
          </div>
          <p style={{ fontSize: "0.88rem", color: "#e2e8f0", marginTop: "0.35rem", lineHeight: 1.5 }}>
            {report.executive_summary}
          </p>
        </div>
      </div>

      {/* Grid of Report Sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1.5rem" }}>
        
        {/* Department SLA & Performance */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Building size={18} />
              <span>Departmental Resolution SLA Compliance</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Open Cases</th>
                  <th>SLA Target</th>
                </tr>
              </thead>
              <tbody>
                {report.department_performance.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.department}</td>
                    <td>
                      <span className="badge badge-medium">{d.open_cases} Active</span>
                    </td>
                    <td>
                      <span className="badge badge-low">{d.sla_compliance}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infrastructure Status Summary */}
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={18} />
              <span>Infrastructure Fleet Telemetry Status</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <strong>Garbage Bins Fleet</strong>
                <span>{report.infrastructure_status.garbage_bins.length} Nodes</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                Responsible: Waste Management Department &bull; Ultrasonic telemetry active across all 4 wards.
              </div>
            </div>

            <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <strong>Drainage & Culvert Network</strong>
                <span>{report.infrastructure_status.drainage_nodes.length} Nodes</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                Responsible: Drainage Department &bull; Culvert water depth and flow rates monitored via LoRaWAN.
              </div>
            </div>

            <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <strong>Water Reservoirs & Tanks</strong>
                <span>{report.infrastructure_status.water_reservoirs.length} Reservoirs</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                Responsible: Water Supply Department &bull; Hydrostatic level pressure sensors online.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Citizen Complaints Summary */}
      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-header">
          <div className="panel-title">
            <BarChart3 size={18} />
            <span>Citizen Grievance Processing Summary</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span className="badge badge-low">
              {report.citizen_complaints_summary.resolved} Resolved
            </span>
            <span className="badge badge-high">
              {report.citizen_complaints_summary.in_progress} In Progress
            </span>
            <span className="badge badge-medium">
              {report.citizen_complaints_summary.pending} Pending
            </span>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Category</th>
                <th>Main Problem</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.citizen_complaints_summary.recent_complaints.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "monospace", color: "var(--color-primary)", fontWeight: 700 }}>
                    {c.id}
                  </td>
                  <td>{c.category}</td>
                  <td style={{ fontWeight: 600 }}>{c.main_problem}</td>
                  <td>{c.location}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.priority === "CRITICAL"
                          ? "badge-critical"
                          : c.priority === "HIGH"
                          ? "badge-high"
                          : "badge-medium"
                      }`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
