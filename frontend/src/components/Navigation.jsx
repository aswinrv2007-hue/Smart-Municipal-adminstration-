import React from "react";
import {
  Crosshair,
  Cpu,
  Send,
  Users,
  FileText,
  AlertTriangle
} from "lucide-react";

export default function Navigation({
  activeTab,
  setActiveTab,
  alertCount = 0,
  criticalCount = 0,
  complaintCount = 0
}) {
  const tabs = [
    {
      id: "satellite",
      label: "Satellite Problem Map",
      icon: Crosshair,
      badge: criticalCount > 0 ? `${criticalCount} Critical` : null,
      isCritical: criticalCount > 0
    },
    {
      id: "infrastructure",
      label: "Smart Infrastructure",
      icon: Cpu,
      badge: null
    },
    {
      id: "citizen",
      label: "Citizen Grievances",
      icon: Send,
      badge: complaintCount > 0 ? complaintCount : null
    },
    {
      id: "profiles",
      label: "People & Profiles",
      icon: Users,
      badge: null
    },
    {
      id: "reports",
      label: "Incident Center & Reports",
      icon: FileText,
      badge: alertCount > 0 ? alertCount : null
    }
  ];

  return (
    <nav className="nav-bar" id="main-navigation-bar">
      <div className="nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              className={`nav-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`tab-badge ${tab.isCritical ? "critical" : ""}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
