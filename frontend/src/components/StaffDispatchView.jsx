import React, { useState } from "react";
import {
  UserCheck,
  Building,
  CheckCircle,
  Clock,
  Send,
  Edit3,
  X
} from "lucide-react";
import { api } from "../api";

export default function StaffDispatchView({ complaints = [], onComplaintUpdated }) {
  const [selectedDept, setSelectedDept] = useState("all");
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState("IN_PROGRESS");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const departments = [
    "all",
    "Waste Management Department",
    "Drainage Department",
    "Water Supply Department",
    "Roads/Municipal Engineering Department",
    "Electrical/Streetlight Department",
    "Environment Department",
    "Technical/Maintenance Department",
    "General Municipal Administration"
  ];

  const filtered = complaints.filter((c) => {
    if (selectedDept === "all") return true;
    return c.responsible_department === selectedDept;
  });

  const openEditModal = (c) => {
    setEditingComplaint(c);
    setNewStatus(c.status);
    setAssignedStaff(c.staff_assigned || "");
    setResolutionNotes(c.resolution_notes || "");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingComplaint) return;
    setIsSaving(true);
    try {
      await api.updateComplaintStatus(editingComplaint.id, {
        status: newStatus,
        staff_assigned: assignedStaff,
        resolution_notes: resolutionNotes
      });
      setEditingComplaint(null);
      if (onComplaintUpdated) onComplaintUpdated();
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="staff-dispatch-container">
      {/* Department Filters */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-header">
          <div className="panel-title">
            <Building size={20} color="#00f0ff" />
            <span>Municipal Department Work Order Dispatch & Resolution</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {departments.map((dept) => {
            const count = complaints.filter((c) =>
              dept === "all" ? true : c.responsible_department === dept
            ).length;

            return (
              <button
                key={dept}
                className={`btn btn-sm ${selectedDept === dept ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedDept(dept)}
              >
                <span>{dept === "all" ? "All Departments" : dept.replace(" Department", "")}</span>
                <span className="badge badge-low" style={{ marginLeft: "4px", fontSize: "0.68rem" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="glass-panel">
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Main Problem & Location</th>
                <th>Priority</th>
                <th>Department</th>
                <th>Assigned Staff</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                    {c.id}
                  </td>
                  <td>
                    <span className="badge badge-medium">{c.category}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.main_problem}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                      📍 {c.location} ({c.ward})
                    </div>
                  </td>
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
                  <td style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {c.responsible_department}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {c.staff_assigned ? (
                      <strong style={{ color: "#fff" }}>{c.staff_assigned}</strong>
                    ) : (
                      <span style={{ color: "var(--color-text-dim)", fontStyle: "italic" }}>Unassigned</span>
                    )}
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
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(c)}
                    >
                      <Edit3 size={13} />
                      <span>Update</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Work Order Modal */}
      {editingComplaint && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
          }}
          onClick={() => setEditingComplaint(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "500px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <h3>Update Municipal Work Order</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingComplaint(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label className="form-label">Case Reference</label>
                <div style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                  {editingComplaint.id} - {editingComplaint.main_problem}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
                  📍 {editingComplaint.location} &bull; Citizen: {editingComplaint.citizen_name}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Update Workflow Status</label>
                <select
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="SUBMITTED">SUBMITTED (Pending Triage)</option>
                  <option value="ASSIGNED">ASSIGNED (Officer Designated)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Crew on site)</option>
                  <option value="RESOLVED">RESOLVED (Action Complete)</option>
                  <option value="CLOSED">CLOSED (Verified)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Field Staff / Crew</label>
                <input
                  type="text"
                  className="form-input"
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  placeholder="e.g. Officer K. Sharma, Crew Squad 2"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Resolution Notes / Action Taken</label>
                <textarea
                  className="form-textarea"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Details of physical repair or sanitation action taken..."
                  rows={3}
                ></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingComplaint(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                  Save Work Order Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
