import React from "react";
import LoRaSimulatorView from "./LoRaSimulatorView";
import { X, Radio } from "lucide-react";

export default function LoRaDrawer({ isOpen, onClose, onSimulatorAction }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        zIndex: 2000,
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          height: "100%",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-subtle)",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Radio size={22} color="#00f0ff" />
            <h3 style={{ fontSize: "1.15rem" }}>LoRaWAN IoT Gateway Simulator</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <LoRaSimulatorView onSimulatorAction={onSimulatorAction} />
      </div>
    </div>
  );
}
