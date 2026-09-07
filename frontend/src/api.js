/**
 * API client for interacting with the Smart Municipal Administration backend.
 */
const API_BASE = "http://127.0.0.1:5000/api";

export const api = {
  // Sensors
  getSensors: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/sensors?${query}`);
    return res.json();
  },
  getSensorHistory: async (sensorId, limit = 20) => {
    const res = await fetch(`${API_BASE}/sensors/${sensorId}/history?limit=${limit}`);
    return res.json();
  },
  postTelemetry: async (payload) => {
    const res = await fetch(`${API_BASE}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Simulator
  simulateTick: async (scenario = "NORMAL", sensorId = null) => {
    const res = await fetch(`${API_BASE}/simulator/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, sensor_id: sensorId }),
    });
    return res.json();
  },

  // Predictions
  getPredictions: async () => {
    const res = await fetch(`${API_BASE}/predictions`);
    return res.json();
  },

  // Alerts
  getAlerts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/alerts?${query}`);
    return res.json();
  },
  updateAlertAction: async (alertId, action, assignedTeam = null, notes = null) => {
    const res = await fetch(`${API_BASE}/alerts/${alertId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, assigned_team: assignedTeam, notes }),
    });
    return res.json();
  },

  // Complaints
  preAnalyzeComplaint: async (payload) => {
    const res = await fetch(`${API_BASE}/complaints/pre-analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  getComplaints: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/complaints?${query}`);
    return res.json();
  },
  submitComplaint: async (payload) => {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  updateComplaintStatus: async (complaintId, payload) => {
    const res = await fetch(`${API_BASE}/complaints/${complaintId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  submitComplaintFeedback: async (complaintId, rating, feedback) => {
    const res = await fetch(`${API_BASE}/complaints/${complaintId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, feedback }),
    });
    return res.json();
  },

  // People & Profiles (Staff & Citizens)
  getStaff: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/staff?${query}`);
    return res.json();
  },
  getStaffMember: async (staffId) => {
    const res = await fetch(`${API_BASE}/staff/${staffId}`);
    return res.json();
  },
  updateStaffStatus: async (staffId, status) => {
    const res = await fetch(`${API_BASE}/staff/${staffId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  getCitizens: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/citizens?${query}`);
    return res.json();
  },
  getCitizenDetail: async (citizenId) => {
    const res = await fetch(`${API_BASE}/citizens/${citizenId}`);
    return res.json();
  },

  // Analytics & Reports
  getAnalyticsSummary: async () => {
    const res = await fetch(`${API_BASE}/analytics/summary`);
    return res.json();
  },
  getMunicipalReport: async () => {
    const res = await fetch(`${API_BASE}/analytics/report`);
    return res.json();
  },
  getThresholds: async () => {
    const res = await fetch(`${API_BASE}/thresholds`);
    return res.json();
  }
};
