import React, { useState, useEffect } from "react";
import {
  Radio,
  Play,
  Square,
  Zap,
  CloudRain,
  ShoppingBag,
  Droplet,
  AlertOctagon,
  RotateCcw,
  CheckCircle2,
  Cpu
} from "lucide-react";
import { api } from "../api";

export default function LoRaSimulatorView({ onSimulatorAction }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeScenario, setActiveScenario] = useState("NORMAL");
  const [lastPacketLog, setLastPacketLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Continuous stream timer
  useEffect(() => {
    let interval = null;
    if (isStreaming) {
      interval = setInterval(async () => {
        try {
          const res = await api.simulateTick(activeScenario);
          if (res.updates) {
            setLastPacketLog((prev) => [
              {
                time: new Date().toLocaleTimeString(),
                scenario: res.scenario,
                count: res.processed_count,
                sampleUpdates: res.updates.slice(0, 3)
              },
              ...prev.slice(0, 7)
            ]);
          }
          if (onSimulatorAction) onSimulatorAction();
        } catch (err) {
          console.error("Continuous telemetry tick failed", err);
        }
      }, 3500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, activeScenario]);

  const triggerTick = async (scenario = activeScenario) => {
    setIsLoading(true);
    try {
      const res = await api.simulateTick(scenario);
      if (res.updates) {
        setLastPacketLog((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            scenario: res.scenario,
            count: res.processed_count,
            sampleUpdates: res.updates.slice(0, 3)
          },
          ...prev.slice(0, 7)
        ]);
      }
      if (onSimulatorAction) onSimulatorAction();
    } catch (err) {
      console.error("Tick failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScenarioChange = (scen) => {
    setActiveScenario(scen);
    triggerTick(scen);
  };

  return (
    <div id="lora-simulator-container">
      {/* Simulation Master Controller */}
      <div className="glass-panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-header">
          <div className="panel-title">
            <Radio size={22} color="#00f0ff" />
            <span>LoRaWAN Gateway & Telemetry Packet Simulator</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              id="stream-toggle-btn"
              className={`btn btn-sm ${isStreaming ? "btn-danger" : "btn-primary"}`}
              onClick={() => setIsStreaming(!isStreaming)}
            >
              {isStreaming ? <Square size={14} /> : <Play size={14} />}
              <span>{isStreaming ? "Stop Live Stream" : "Start Live LoRa Stream"}</span>
            </button>

            <button
              id="single-tick-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => triggerTick()}
              disabled={isLoading || isStreaming}
            >
              <Zap size={14} />
              <span>Step Telemetry (Tick)</span>
            </button>
          </div>
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
          Architecture: <strong>IoT Sensor &rarr; LoRa Module (868 MHz) &rarr; LoRa Gateway &rarr; Cloud Server &rarr; AI Municipal Agent</strong>.
          Use the scenario buttons below to inject physical city conditions into the telemetry stream to observe the AI Agent's real-time threshold detection, automated alerts, and predictive trend evaluation.
        </div>

        {/* Stress Test Scenarios */}
        <div>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-dim)", marginBottom: "0.6rem" }}>
            Inject Operational Scenarios:
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              id="scenario-rain-btn"
              className={`btn btn-sm ${activeScenario === "RAIN_SURGE" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleScenarioChange("RAIN_SURGE")}
            >
              <CloudRain size={14} color="#60a5fa" />
              <span>Flash Storm: Drainage Surge</span>
            </button>

            <button
              id="scenario-market-btn"
              className={`btn btn-sm ${activeScenario === "MARKET_GARBAGE" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleScenarioChange("MARKET_GARBAGE")}
            >
              <ShoppingBag size={14} color="#f59e0b" />
              <span>Market Rush: Garbage Overflow</span>
            </button>

            <button
              id="scenario-drought-btn"
              className={`btn btn-sm ${activeScenario === "WATER_DROUGHT" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleScenarioChange("WATER_DROUGHT")}
            >
              <Droplet size={14} color="#06b6d4" />
              <span>Main Pipe Rupture: Tank Depletion</span>
            </button>

            <button
              id="scenario-fault-btn"
              className={`btn btn-sm ${activeScenario === "SENSOR_FAULT" ? "btn-danger" : "btn-secondary"}`}
              onClick={() => handleScenarioChange("SENSOR_FAULT")}
            >
              <AlertOctagon size={14} />
              <span>Sensor Failure Injection</span>
            </button>

            <button
              id="scenario-normal-btn"
              className={`btn btn-sm ${activeScenario === "NORMAL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => handleScenarioChange("NORMAL")}
            >
              <RotateCcw size={14} />
              <span>Reset to Normal Cycle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gateway Telemetry Frame Activity Log */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Cpu size={18} />
            <span>LoRaWAN Gateway Telemetry Transmission Feed</span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>
            Protocol: LoRaWAN 1.0.4 Class A &bull; Band: EU868 / US915
          </span>
        </div>

        {lastPacketLog.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-dim)" }}>
            Click "Step Telemetry (Tick)" or "Start Live LoRa Stream" to generate wireless sensor uplinks.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {lastPacketLog.map((log, index) => (
              <div
                key={index}
                style={{
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem 1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-text-dim)" }}>
                      {log.time}
                    </span>
                    <span className="badge badge-low" style={{ fontSize: "0.68rem" }}>
                      Scenario: {log.scenario}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                      Processed {log.count} node uplinks
                    </span>
                  </div>
                  <span className="badge badge-online" style={{ fontSize: "0.65rem" }}>
                    Gateway Uplink OK
                  </span>
                </div>

                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
                  {log.sampleUpdates.map((u, i) => (
                    <span key={i} style={{ background: "rgba(255, 255, 255, 0.04)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                      <strong>{u.sensor_id}</strong>: {u.reading}% ({u.condition})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
