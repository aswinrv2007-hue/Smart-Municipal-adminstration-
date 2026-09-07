import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import SatelliteMap from "./components/SatelliteMap";
import InfrastructureView from "./components/InfrastructureView";
import CitizenPortal from "./components/CitizenPortal";
import ProfilesView from "./components/ProfilesView";
import AlertsView from "./components/AlertsView";
import MunicipalReportsView from "./components/MunicipalReportsView";
import LoRaDrawer from "./components/LoRaDrawer";
import { api } from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState("satellite");
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [summary, setSummary] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState(null);

  // Load all central municipal data
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [sensorsRes, alertsRes, complaintsRes, staffRes, summaryRes] = await Promise.all([
        api.getSensors(),
        api.getAlerts(),
        api.getComplaints(),
        api.getStaff(),
        api.getAnalyticsSummary()
      ]);

      setSensors(sensorsRes.sensors || []);
      setAlerts(alertsRes.alerts || []);
      setComplaints(complaintsRes.complaints || []);
      const staffMembers = staffRes.staff || [];
      setStaffList(staffMembers);
      if (!activeProfile && staffMembers.length > 0) {
        setActiveProfile(staffMembers[0]);
      }
      setSummary(summaryRes || {});
    } catch (err) {
      console.error("Failed to sync municipal data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = alerts.filter(
    (a) => a.priority === "CRITICAL" && a.status === "ACTIVE"
  ).length;

  const activeAlertCount = alerts.filter(
    (a) => a.status === "ACTIVE" || a.status === "ACKNOWLEDGED"
  ).length;

  const pendingComplaintCount = complaints.filter(
    (c) => c.status === "SUBMITTED" || c.status === "ASSIGNED"
  ).length;

  const handleMapPinSelected = (coords) => {
    setPinnedCoords(coords);
  };

  return (
    <div className="app-container">
      <Header
        alerts={alerts}
        onRefresh={refreshData}
        isRefreshing={isRefreshing}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        activeProfile={activeProfile}
        setActiveProfile={setActiveProfile}
        staffList={staffList}
      />

      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={activeAlertCount}
        criticalCount={criticalCount}
        complaintCount={pendingComplaintCount}
      />

      <main className="main-content">
        {/* 1. Satellite GIS Problem Map */}
        {activeTab === "satellite" && (
          <SatelliteMap
            alerts={alerts}
            complaints={complaints}
            sensors={sensors}
            onSelectIncident={(incident) => {
              console.log("Selected incident on satellite:", incident);
            }}
            onMapPinSelected={handleMapPinSelected}
          />
        )}

        {/* 2. Smart Infrastructure */}
        {activeTab === "infrastructure" && (
          <InfrastructureView
            sensors={sensors}
            onTelemetryUpdate={refreshData}
          />
        )}

        {/* 3. Citizen Grievances */}
        {activeTab === "citizen" && (
          <CitizenPortal
            complaints={complaints}
            onComplaintSubmitted={refreshData}
            pinnedCoords={pinnedCoords}
            onOpenSatelliteMap={() => setActiveTab("satellite")}
          />
        )}

        {/* 4. People & Profiles Directory */}
        {activeTab === "profiles" && (
          <ProfilesView
            complaints={complaints}
          />
        )}

        {/* 5. Incident Center & Reports */}
        {activeTab === "reports" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <AlertsView
                alerts={alerts}
                onAlertUpdated={refreshData}
              />
            </div>
            <MunicipalReportsView />
          </div>
        )}
      </main>

      {/* LoRa IoT Simulation Drawer (Unobtrusive) */}
      <LoRaDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulatorAction={refreshData}
      />

      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "1.2rem 2rem", textAlign: "center", color: "var(--color-text-dim)", fontSize: "0.78rem", background: "var(--bg-surface)" }}>
        Smart Municipal Administration AI Agent &bull; GIS Satellite Infrastructure Operations &bull; Civic Command Center
      </footer>
    </div>
  );
}
