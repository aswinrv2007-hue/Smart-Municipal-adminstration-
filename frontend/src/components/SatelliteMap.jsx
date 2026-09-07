import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  MapPin,
  AlertTriangle,
  Send,
  Cpu,
  Crosshair,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  CheckCircle2
} from "lucide-react";

export default function SatelliteMap({
  alerts = [],
  complaints = [],
  sensors = [],
  onSelectIncident,
  onMapPinSelected
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [mapType, setMapType] = useState("satellite"); // 'satellite' | 'streets'
  const [filterLayer, setFilterLayer] = useState("all"); // 'all' | 'alerts' | 'complaints' | 'sensors'
  const [selectedItem, setSelectedItem] = useState(null);
  const [pinDropMode, setPinDropMode] = useState(false);
  const [pinnedCoord, setPinnedCoord] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Map centered over metropolitan city bounds
      const map = L.map(mapContainerRef.current, {
        center: [12.974, 77.603],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      // Satellite Imagery (Esri World Imagery)
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      );

      // Labels & Boundaries Overlay
      const labelsLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      );

      // OpenStreetMap Streets
      const streetsLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19 }
      );

      satelliteLayer.addTo(map);
      labelsLayer.addTo(map);

      map._satelliteLayer = satelliteLayer;
      map._labelsLayer = labelsLayer;
      map._streetsLayer = streetsLayer;

      // Group for problem markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Click event for Pin Drop Mode
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setPinnedCoord({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
        if (onMapPinSelected) {
          onMapPinSelected({ lat: parseFloat(lat.toFixed(5)), lng: parseFloat(lng.toFixed(5)) });
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Don't destroy on simple rerenders
    };
  }, []);

  // Switch Base Layer (Satellite vs Streets)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mapType === "satellite") {
      if (map.hasLayer(map._streetsLayer)) map.removeLayer(map._streetsLayer);
      if (!map.hasLayer(map._satelliteLayer)) map.addLayer(map._satelliteLayer);
      if (!map.hasLayer(map._labelsLayer)) map.addLayer(map._labelsLayer);
    } else {
      if (map.hasLayer(map._satelliteLayer)) map.removeLayer(map._satelliteLayer);
      if (map.hasLayer(map._labelsLayer)) map.removeLayer(map._labelsLayer);
      if (!map.hasLayer(map._streetsLayer)) map.addLayer(map._streetsLayer);
    }
  }, [mapType]);

  // Update Problem Markers on the Satellite Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Plot Active Municipal Alerts (Pulsing Beacons)
    if (filterLayer === "all" || filterLayer === "alerts") {
      alerts.forEach((alert) => {
        if (!alert.latitude || !alert.longitude) return;

        const isCritical = alert.priority === "CRITICAL";
        const markerHtml = `
          <div class="satellite-marker-beacon ${isCritical ? "critical" : "high"}">
            <div class="beacon-pulse"></div>
            <div class="beacon-core"></div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: "custom-leaflet-beacon",
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([alert.latitude, alert.longitude], { icon });
        marker.on("click", () => {
          setSelectedItem({ type: "ALERT", data: alert });
          if (onSelectIncident) onSelectIncident(alert);
        });

        marker.bindTooltip(
          `<strong>[${alert.priority}] ${alert.problem_type}</strong><br/>${alert.location}`,
          { direction: "top", offset: [0, -10], className: "satellite-tooltip" }
        );

        markersLayer.addLayer(marker);
      });
    }

    // 2. Plot Citizen Grievances
    if (filterLayer === "all" || filterLayer === "complaints") {
      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;

        const isResolved = c.status === "RESOLVED";
        const markerHtml = `
          <div class="satellite-marker-citizen ${isResolved ? "resolved" : ""}">
            <span>📍</span>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: "custom-leaflet-citizen",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([c.latitude, c.longitude], { icon });
        marker.on("click", () => {
          setSelectedItem({ type: "COMPLAINT", data: c });
          if (onSelectIncident) onSelectIncident(c);
        });

        marker.bindTooltip(
          `<strong>${c.id}: ${c.main_problem}</strong><br/>Citizen: ${c.citizen_name}`,
          { direction: "top", offset: [0, -10], className: "satellite-tooltip" }
        );

        markersLayer.addLayer(marker);
      });
    }

    // 3. Plot IoT Infrastructure Sensors
    if (filterLayer === "all" || filterLayer === "sensors") {
      sensors.forEach((s) => {
        if (!s.latitude || !s.longitude) return;

        const isProblem = s.status === "CRITICAL" || s.status === "WARNING" || s.status === "FAULT";
        const markerHtml = `
          <div class="satellite-marker-sensor ${isProblem ? "warning" : "online"}">
            <span>${s.type === "garbage_bin" ? "🗑️" : s.type === "drainage" ? "🌊" : "💧"}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: "custom-leaflet-sensor",
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([s.latitude, s.longitude], { icon });
        marker.on("click", () => {
          setSelectedItem({ type: "SENSOR", data: s });
          if (onSelectIncident) onSelectIncident(s);
        });

        marker.bindTooltip(
          `<strong>${s.id}: ${s.name}</strong><br/>Reading: ${s.current_reading}${s.unit} (${s.condition_label})`,
          { direction: "top", offset: [0, -10], className: "satellite-tooltip" }
        );

        markersLayer.addLayer(marker);
      });
    }

    // 4. Pin Drop Marker if active
    if (pinnedCoord) {
      const pinIcon = L.divIcon({
        html: `<div style="font-size:26px;filter:drop-shadow(0 0 8px #00f0ff);transform:translate(-50%,-100%);">🎯</div>`,
        className: "custom-pin",
        iconSize: [30, 30]
      });
      const pinMarker = L.marker([pinnedCoord.lat, pinnedCoord.lng], { icon: pinIcon });
      pinMarker.bindTooltip("New Grievance GPS Pin", { permanent: true, direction: "top" });
      markersLayer.addLayer(pinMarker);
    }
  }, [alerts, complaints, sensors, filterLayer, pinnedCoord]);

  return (
    <div id="satellite-map-view" className="satellite-map-wrapper">
      {/* Top Map Action Toolbar */}
      <div className="satellite-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--color-primary)", fontWeight: 700, fontSize: "0.95rem" }}>
            <Crosshair size={18} />
            <span>GIS Satellite Problem Locator</span>
          </div>

          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              className={`btn btn-sm ${filterLayer === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterLayer("all")}
            >
              All Locations ({alerts.length + complaints.length + sensors.length})
            </button>
            <button
              className={`btn btn-sm ${filterLayer === "alerts" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterLayer("alerts")}
            >
              <AlertTriangle size={13} color="#ef4444" />
              <span>Active Alerts ({alerts.length})</span>
            </button>
            <button
              className={`btn btn-sm ${filterLayer === "complaints" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterLayer("complaints")}
            >
              <Send size={13} color="#00f0ff" />
              <span>Citizen Grievances ({complaints.length})</span>
            </button>
            <button
              className={`btn btn-sm ${filterLayer === "sensors" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilterLayer("sensors")}
            >
              <Cpu size={13} color="#10b981" />
              <span>IoT Field Nodes ({sensors.length})</span>
            </button>
          </div>
        </div>

        {/* Layer Switcher & Pin Drop Mode */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className={`btn btn-sm ${pinDropMode ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setPinDropMode(!pinDropMode)}
            title="Click anywhere on satellite imagery to pin a new municipal problem"
          >
            <MapPin size={14} />
            <span>{pinDropMode ? "Click Map to Pin GPS" : "Pin Incident Location"}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setMapType(mapType === "satellite" ? "streets" : "satellite")}
          >
            <Layers size={14} />
            <span>{mapType === "satellite" ? "Street Layer" : "Satellite Imagery"}</span>
          </button>
        </div>
      </div>

      {/* Main Map Container + Floating Problem Intelligence Card */}
      <div className="satellite-map-container-inner">
        <div
          ref={mapContainerRef}
          id="leaflet-satellite-canvas"
          style={{ width: "100%", height: "620px", borderRadius: "var(--radius-lg)", overflow: "hidden" }}
        ></div>

        {/* Floating Problem Intelligence Card */}
        {selectedItem && (
          <div className="satellite-incident-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span className={`badge ${
                  selectedItem.data.priority === "CRITICAL"
                    ? "badge-critical"
                    : selectedItem.data.priority === "HIGH"
                    ? "badge-high"
                    : "badge-medium"
                }`}>
                  {selectedItem.data.priority || selectedItem.data.status || "ACTIVE"}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-primary)" }}>
                  {selectedItem.data.id}
                </span>
              </div>
              <button
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem" }}
                onClick={() => setSelectedItem(null)}
              >
                &times;
              </button>
            </div>

            <h4 style={{ fontSize: "1rem", color: "#fff", marginBottom: "0.25rem" }}>
              {selectedItem.data.problem_type || selectedItem.data.main_problem || selectedItem.data.name}
            </h4>

            <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "0.6rem" }}>
              📍 <strong>Location:</strong> {selectedItem.data.location}
              <br />
              🌐 <strong>GPS Coordinates:</strong> {selectedItem.data.latitude?.toFixed(4)}, {selectedItem.data.longitude?.toFixed(4)}
            </div>

            {selectedItem.data.recommended_action && (
              <div style={{ background: "rgba(0, 240, 255, 0.08)", borderLeft: "3px solid #00f0ff", padding: "0.4rem 0.6rem", fontSize: "0.78rem", color: "#e2e8f0", marginBottom: "0.6rem", borderRadius: "0 4px 4px 0" }}>
                <strong>Directive:</strong> {selectedItem.data.recommended_action}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--color-text-dim)" }}>
              <span>Dept: <strong>{selectedItem.data.responsible_department}</strong></span>
              <span>Status: <strong style={{ color: "#10b981" }}>{selectedItem.data.status}</strong></span>
            </div>
          </div>
        )}

        {/* Coordinates feedback when pin dropped */}
        {pinnedCoord && (
          <div className="satellite-coords-pill">
            <span>Pinned GPS: <strong>{pinnedCoord.lat}, {pinnedCoord.lng}</strong></span>
            <button
              onClick={() => setPinnedCoord(null)}
              style={{ background: "none", border: "none", color: "#fff", marginLeft: "6px", cursor: "pointer" }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Map Legend */}
        <div className="satellite-legend">
          <div className="legend-item">
            <span className="legend-dot critical"></span>
            <span>Critical Alert (Safety Hazard)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot high"></span>
            <span>High Priority Issue</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot citizen"></span>
            <span>Citizen Grievance</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot sensor"></span>
            <span>IoT Sensor Node</span>
          </div>
        </div>
      </div>
    </div>
  );
}
