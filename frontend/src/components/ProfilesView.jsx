import React, { useState, useEffect } from "react";
import {
  Users,
  Building,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Briefcase,
  ShieldCheck,
  Search,
  ExternalLink,
  Clock,
  UserCheck,
  X
} from "lucide-react";
import { api } from "../api";

export default function ProfilesView({ complaints = [] }) {
  const [activeTab, setActiveTab] = useState("staff"); // 'staff' | 'citizens'
  const [staffList, setStaffList] = useState([]);
  const [citizenList, setCitizenList] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [filterDept, setFilterDept] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [staffRes, ctzRes] = await Promise.all([
          api.getStaff(),
          api.getCitizens()
        ]);
        setStaffList(staffRes.staff || []);
        setCitizenList(ctzRes.citizens || []);
      } catch (err) {
        console.error("Failed to load profiles", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateStatus = async (staffId, newStatus) => {
    try {
      await api.updateStaffStatus(staffId, newStatus);
      const updated = staffList.map((s) => (s.id === staffId ? { ...s, status: newStatus } : s));
      setStaffList(updated);
      if (selectedPerson && selectedPerson.id === staffId) {
        setSelectedPerson({ ...selectedPerson, status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update staff status", err);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (filterDept !== "all" && s.department !== filterDept) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.role.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredCitizens = citizenList.filter((c) => {
    if (filterWard !== "all" && c.ward !== filterWard) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    if (status === "AVAILABLE") return <span className="badge badge-low">Available</span>;
    if (status === "ON_DUTY") return <span className="badge badge-high">On Duty</span>;
    if (status === "DISPATCHED") return <span className="badge badge-critical">Dispatched on Site</span>;
    return <span className="badge badge-medium">Off Duty</span>;
  };

  return (
    <div id="profiles-view-container">
      {/* Sub-nav: Staff vs Citizens */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem", padding: "1rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              id="profiles-tab-staff"
              className={`btn ${activeTab === "staff" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("staff")}
            >
              <Briefcase size={16} />
              <span>Municipal Staff & Engineers ({staffList.length})</span>
            </button>
            <button
              id="profiles-tab-citizens"
              className={`btn ${activeTab === "citizens" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab("citizens")}
            >
              <Users size={16} />
              <span>Registered Citizens ({citizenList.length})</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "#64748b" }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: "30px", width: "220px", fontSize: "0.82rem" }}
                placeholder="Search person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === "staff" ? (
              <select
                className="form-select"
                style={{ width: "auto", fontSize: "0.8rem" }}
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                <option value="Roads/Municipal Engineering Department">Roads Engineering</option>
                <option value="Electrical/Streetlight Department">Electrical / Streetlights</option>
                <option value="Water Supply Department">Water Supply</option>
                <option value="Waste Management Department">Waste Management</option>
                <option value="Drainage Department">Drainage</option>
                <option value="Technical/Maintenance Department">IoT / Technical</option>
              </select>
            ) : (
              <select
                className="form-select"
                style={{ width: "auto", fontSize: "0.8rem" }}
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
              >
                <option value="all">All Wards</option>
                <option value="Ward 1">Ward 1</option>
                <option value="Ward 2">Ward 2</option>
                <option value="Ward 4">Ward 4</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Staff Directory */}
      {activeTab === "staff" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="glass-panel"
              id={`staff-card-${staff.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "1.25rem",
                transition: "var(--transition)"
              }}
            >
              <div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <img
                    src={staff.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop"}
                    alt={staff.name}
                    style={{ width: "56px", height: "56px", borderRadius: "var(--radius-md)", objectFit: "cover", border: "2px solid rgba(0, 240, 255, 0.4)" }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--color-primary)" }}>
                        {staff.id}
                      </span>
                      {getStatusBadge(staff.status)}
                    </div>
                    <h3 style={{ fontSize: "1.05rem", marginTop: "0.2rem" }}>{staff.name}</h3>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
                      {staff.role}
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "0.75rem", fontSize: "0.8rem" }}>
                  <div style={{ color: "var(--color-text-muted)" }}>
                    🏢 <strong>Dept:</strong> {staff.department}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                    📍 <strong>Assigned Area:</strong> {staff.ward}
                  </div>
                </div>

                {/* Performance & Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.75rem" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ color: "var(--color-text-dim)" }}>Cases Resolved</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>
                      {staff.completed_cases}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ color: "var(--color-text-dim)" }}>Performance Score</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#f59e0b" }}>
                      <Star size={14} fill="#f59e0b" />
                      <span>{staff.rating}</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <div>📞 {staff.phone}</div>
                  <div>✉️ {staff.email}</div>
                </div>
              </div>

              {/* Status Update Quick Buttons */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem", marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-dim)" }}>Set Duty:</span>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    className={`btn btn-sm ${staff.status === "AVAILABLE" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => handleUpdateStatus(staff.id, "AVAILABLE")}
                  >
                    Available
                  </button>
                  <button
                    className={`btn btn-sm ${staff.status === "ON_DUTY" ? "btn-primary" : "btn-secondary"}`}
                    style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => handleUpdateStatus(staff.id, "ON_DUTY")}
                  >
                    On Duty
                  </button>
                  <button
                    className={`btn btn-sm ${staff.status === "DISPATCHED" ? "btn-danger" : "btn-secondary"}`}
                    style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem" }}
                    onClick={() => handleUpdateStatus(staff.id, "DISPATCHED")}
                  >
                    Dispatched
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Citizens Directory */}
      {activeTab === "citizens" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {filteredCitizens.map((citizen) => (
            <div
              key={citizen.id}
              className="glass-panel"
              id={`citizen-card-${citizen.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "1.25rem"
              }}
            >
              <div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <img
                    src={citizen.avatar_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop"}
                    alt={citizen.name}
                    style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(16, 185, 129, 0.4)" }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--color-primary)" }}>
                        {citizen.id}
                      </span>
                      <span className="badge badge-low" style={{ fontSize: "0.65rem" }}>
                        Verified Resident
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.05rem", marginTop: "0.2rem" }}>{citizen.name}</h3>
                    <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
                      📍 {citizen.ward} &bull; {citizen.address}
                    </div>
                  </div>
                </div>

                <div style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                    <span>Civic Engagement Score:</span>
                    <strong style={{ color: "#10b981" }}>{citizen.reputation_score} / 100</strong>
                  </div>
                  <div className="progress-track" style={{ height: "6px" }}>
                    <div
                      className="progress-fill green"
                      style={{ width: `${citizen.reputation_score}%` }}
                    ></div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
                  <div>📞 {citizen.contact}</div>
                  <div>✉️ {citizen.email}</div>
                  <div>Grievances Filed: <strong style={{ color: "#fff" }}>{citizen.total_reported}</strong></div>
                  <div>Verification: <strong style={{ color: "#10b981" }}>Active Citizen</strong></div>
                </div>
              </div>

              <div style={{ marginTop: "1rem" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: "100%" }}
                  onClick={() => setSelectedPerson({ type: "CITIZEN", ...citizen })}
                >
                  <ExternalLink size={13} />
                  <span>View Reported Cases</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Person Detail Modal */}
      {selectedPerson && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
          }}
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="glass-panel"
            style={{ maxWidth: "550px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <img
                  src={selectedPerson.avatar_url}
                  alt={selectedPerson.name}
                  style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover" }}
                />
                <div>
                  <h3>{selectedPerson.name}</h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-dim)" }}>
                    {selectedPerson.id} &bull; {selectedPerson.ward}
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPerson(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ margin: "1rem 0" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--color-primary)", marginBottom: "0.5rem" }}>
                Grievance History for {selectedPerson.name}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {complaints
                  .filter((c) => c.citizen_name === selectedPerson.name)
                  .map((c) => (
                    <div
                      key={c.id}
                      style={{ background: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <strong style={{ color: "var(--color-primary)" }}>{c.id}</strong>
                        <span className="badge badge-low">{c.status}</span>
                      </div>
                      <div style={{ marginTop: "0.2rem" }}>{c.main_problem}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-dim)", marginTop: "0.2rem" }}>
                        📍 {c.location} &bull; Dept: {c.responsible_department}
                      </div>
                    </div>
                  ))}
                {complaints.filter((c) => c.citizen_name === selectedPerson.name).length === 0 && (
                  <div style={{ color: "var(--color-text-dim)", fontSize: "0.82rem" }}>
                    No pending grievances filed currently.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
