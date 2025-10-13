import React, { useState } from "react";
import "./MonitoringPanel.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";

interface MonitoringData {
  phase: number | null;
  voltage: number | null;
  current: number | null;
  power: number | null;
  period: number | null;
  resonance_frequency: number | null;
  resonance_status: string | null;
}

type UnitType = "phase" | "current" | "power" | "period";

interface UnitConfig {
  label: string;
  convert: (value: number) => number;
}

const unitConversions: Record<UnitType, UnitConfig[]> = {
  phase: [
    { label: "ns", convert: (val) => val },
    { label: "µs", convert: (val) => val / 1000 },
    { label: "ms", convert: (val) => val / 1000000 },
  ],
  current: [
    { label: "A", convert: (val) => val },
    { label: "mA", convert: (val) => val * 1000 },
    { label: "µA", convert: (val) => val * 1000000 },
  ],
  power: [
    { label: "VA", convert: (val) => val },
    { label: "kVA", convert: (val) => val / 1000 },
    { label: "mVA", convert: (val) => val * 1000 },
    { label: "µVA", convert: (val) => val * 1000000 },
  ],
  period: [
    { label: "s", convert: (val) => val },
    { label: "ms", convert: (val) => val * 1000 },
    { label: "µs", convert: (val) => val * 1000000 },
    { label: "ns", convert: (val) => val * 1000000000 },
  ],
};

const MonitoringPanel: React.FC = () => {
  const [data, setData] = useState<MonitoringData>({
    phase: null,
    voltage: null,
    current: null,
    power: null,
    period: null,
    resonance_frequency: null,
    resonance_status: null,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Unit selection state
  const [selectedUnits, setSelectedUnits] = useState<Record<UnitType, string>>({
    phase: "ns",
    current: "A",
    power: "VA",
    period: "s",
  });

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();

  // Helper function to format phase values with proper precision and lead/lag indication
  const formatPhaseValue = (value: number | null, unit: string): string => {
    if (value === null) return "";

    const absValue = Math.abs(value);
    let convertedValue: number;

    if (unit === "ns") {
      convertedValue = absValue;
    } else if (unit === "µs") {
      convertedValue = absValue / 1000;
    } else {
      // ms
      convertedValue = absValue / 1000000;
    }

    // Use maximum precision without rounding
    if (unit === "ns") {
      return convertedValue.toFixed(0);
    } else if (unit === "µs") {
      // Show up to 3 decimal places for microseconds
      return convertedValue.toFixed(3);
    } else {
      // ms
      // Show up to 6 decimal places for milliseconds
      return convertedValue.toFixed(6);
    }
  };

  // Helper function to get phase lead/lag information
  const getPhaseRelationship = (phase: number | null): string => {
    if (phase === null) return "";
    if (phase === 0) return " (in phase)";
    if (phase < 0) return " (current leads voltage)";
    return " (voltage leads current)";
  };

  // Helper function to format other values based on selected unit
  const formatValue = (value: number | null, type: UnitType): string => {
    if (value === null) return "";

    const currentUnit = selectedUnits[type];
    const unitConfig = unitConversions[type].find(
      (unit) => unit.label === currentUnit
    );

    if (!unitConfig) return value.toString();

    const convertedValue = unitConfig.convert(value);

    // Apply appropriate formatting based on the value magnitude
    if (type === "current") {
      return convertedValue.toFixed(4);
    } else if (type === "power") {
      return convertedValue.toFixed(3);
    } else if (type === "period") {
      // Use scientific notation for very small period values
      return convertedValue < 0.001
        ? convertedValue.toExponential(3)
        : convertedValue.toFixed(6);
    }

    return convertedValue.toString();
  };

  // Handle unit change
  const handleUnitChange = (type: UnitType, newUnit: string) => {
    setSelectedUnits((prev) => ({
      ...prev,
      [type]: newUnit,
    }));
  };

  async function fetchAllMetrics() {
    try {
      setLoading(true);
      setMessage(null);
      const response = await makeRequest("/monitoring", { method: "GET" });

      if (response.data.success) {
        const d = response.data.data;
        setData({
          phase: d.phase,
          voltage: d.voltage,
          current: d.current,
          power: d.power,
          period: d.period,
          resonance_frequency: d.resonance?.resonance_frequency ?? null,
          resonance_status: d.resonance?.status_text ?? null,
        });
        setMessage("✅ Monitoring data updated");
      } else {
        setMessage(`❌ ${response.data.error || "Failed to fetch data"}`);
      }
    } catch (err) {
      console.error("Failed to fetch monitoring data:", err);
      setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetric(metric: keyof MonitoringData | "resonance") {
    try {
      setLoading(true);
      setMessage(null);
      const response = await makeRequest(`/monitoring/${metric}`, {
        method: "GET",
      });

      if (!response.data.success) {
        setMessage(`❌ ${response.data.error || "Request failed"}`);
        return;
      }

      // Handle special cases
      if (metric === "resonance") {
        const r = response.data.resonance;
        setData((prev) => ({
          ...prev,
          resonance_frequency: r.resonance_frequency,
          resonance_status: r.status_text,
        }));
        setMessage("✅ Resonance frequency updated");
      } else if (metric === "period") {
        setData((prev) => ({ ...prev, period: response.data.period }));
        setMessage("✅ Period updated");
      } else {
        // Normal single value metric
        setData((prev) => ({ ...prev, [metric]: response.data[metric] }));
        setMessage(`✅ ${metric} updated`);
      }
    } catch (err) {
      console.error(`Failed to fetch ${metric}:`, err);
      setMessage(`❌ Failed to fetch ${metric}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <h2>Monitoring Panel</h2>

      <div className="fieldGroup">
        <label>Phase Difference</label>
        <div className="input-with-unit">
          <input
            type="text"
            value={formatPhaseValue(data.phase, selectedUnits.phase)}
            readOnly
          />
          <select
            value={selectedUnits.phase}
            onChange={(e) => handleUnitChange("phase", e.target.value)}
            disabled={!connected || loading}
          >
            {unitConversions.phase.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        {data.phase !== null && (
          <small className="phase-relationship">
            {getPhaseRelationship(data.phase)}
          </small>
        )}
        <button
          onClick={() => fetchMetric("phase")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Voltage (V)</label>
        <input
          type="text"
          value={data.voltage !== null ? data.voltage.toFixed(3) : ""}
          readOnly
        />
        <button
          onClick={() => fetchMetric("voltage")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Current</label>
        <div className="input-with-unit">
          <input
            type="text"
            value={formatValue(data.current, "current")}
            readOnly
          />
          <select
            value={selectedUnits.current}
            onChange={(e) => handleUnitChange("current", e.target.value)}
            disabled={!connected || loading}
          >
            {unitConversions.current.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchMetric("current")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Power</label>
        <div className="input-with-unit">
          <input
            type="text"
            value={formatValue(data.power, "power")}
            readOnly
          />
          <select
            value={selectedUnits.power}
            onChange={(e) => handleUnitChange("power", e.target.value)}
            disabled={!connected || loading}
          >
            {unitConversions.power.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchMetric("power")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Signal Period</label>
        <div className="input-with-unit">
          <input
            type="text"
            value={formatValue(data.period, "period")}
            readOnly
          />
          <select
            value={selectedUnits.period}
            onChange={(e) => handleUnitChange("period", e.target.value)}
            disabled={!connected || loading}
          >
            {unitConversions.period.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchMetric("period")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Resonance Frequency (Hz)</label>
        <input
          type="text"
          value={
            data.resonance_frequency !== null
              ? data.resonance_frequency.toLocaleString()
              : ""
          }
          readOnly
        />
        {data.resonance_status && (
          <small>Status: {data.resonance_status}</small>
        )}
        <button
          onClick={() => fetchMetric("resonance")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="buttons">
        <button onClick={fetchAllMetrics} disabled={!connected || loading}>
          🔄 Refresh All
        </button>
      </div>

      {!connected && <p className="warning">⚠️ Connect to a device first</p>}
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default MonitoringPanel;
