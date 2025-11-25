import React, { useState } from "react";
import "./MonitoringPanel.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";
import ResonanceModal from "../ResonanceModal/ResonanceModal";

interface PhaseData {
  seconds: number;
  degrees: number;
}

interface FrequencyMetrics {
  frequency: number;
  phase: number;
  current: number;
}

interface ResonanceData {
  status_code: number;
  status_text: string;
  best_overall: FrequencyMetrics | null;
  best_phase: FrequencyMetrics | null;
  best_current: FrequencyMetrics | null;
}

interface MonitoringData {
  phase: PhaseData | null;
  voltage: number | null;
  current: number | null;
  power: number | null;
  period: number | null;
  resonance: ResonanceData | null;
}

type UnitType = "phase" | "current" | "power" | "period";

interface UnitConfig {
  label: string;
  convert: (seconds: number) => number;
}

const unitConversions: Record<UnitType, UnitConfig[]> = {
  phase: [
    { label: "ns", convert: (s) => s * 1e9 },
    { label: "µs", convert: (s) => s * 1e6 },
    { label: "ms", convert: (s) => s * 1e3 },
    { label: "s", convert: (s) => s },
  ],
  current: [
    { label: "A", convert: (v) => v },
    { label: "mA", convert: (v) => v * 1000 },
    { label: "µA", convert: (v) => v * 1000000 },
  ],
  power: [
    { label: "VA", convert: (v) => v },
    { label: "kVA", convert: (v) => v / 1000 },
    { label: "mVA", convert: (v) => v * 1000 },
    { label: "µVA", convert: (v) => v * 1000000 },
  ],
  period: [
    { label: "s", convert: (v) => v },
    { label: "ms", convert: (v) => v * 1000 },
    { label: "µs", convert: (v) => v * 1000000 },
    { label: "ns", convert: (v) => v * 1000000000 },
  ],
};

const MonitoringPanel: React.FC = () => {
  const [data, setData] = useState<MonitoringData>({
    phase: null,
    voltage: null,
    current: null,
    power: null,
    period: null,
    resonance: null,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedUnits, setSelectedUnits] = useState<Record<UnitType, string>>({
    phase: "ns",
    current: "A",
    power: "VA",
    period: "s",
  });

  const [phaseAngleUnit, setPhaseAngleUnit] = useState<"deg" | "rad">("deg");

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();

  const [showResonanceModal, setShowResonanceModal] = useState(false);

  const getPhaseRelationship = (phase: PhaseData | null): string => {
    if (!phase) return "";
    const value = phase.seconds;
    if (value === 0) return "(in phase)";
    if (value < 0) return "(current leads voltage)";
    return "(voltage leads current)";
  };

  const formatPhaseTime = (phase: PhaseData | null, unit: string): string => {
    if (!phase) return "";
    const converter = unitConversions.phase.find((u) => u.label === unit);
    if (!converter) return "";
    const value = converter.convert(Math.abs(phase.seconds));
    return value.toPrecision(6).replace(/\.?0+$/, "");
  };

  const formatPhaseAngle = (phase: PhaseData | null): string => {
    if (!phase) return "";
    const deg = phase.degrees;

    if (phaseAngleUnit === "deg") {
      return deg.toFixed(2) + "°";
    } else {
      const radRatio = deg / 180;
      const formatted = radRatio.toFixed(3).replace(/\.?0+$/, "");
      return `${formatted}π`;
    }
  };

  const handleUnitChange = (type: UnitType, newUnit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [type]: newUnit }));
  };

  const handleAngleUnitChange = (newUnit: "deg" | "rad") => {
    setPhaseAngleUnit(newUnit);
  };

  const formatValue = (value: number | null, type: UnitType): string => {
    if (value === null) return "";
    const unit = selectedUnits[type];
    const config = unitConversions[type].find((u) => u.label === unit);
    if (!config) return value.toString();
    const converted = config.convert(value);
    if (type === "current") return converted.toFixed(4);
    if (type === "power") return converted.toFixed(3);
    if (type === "period")
      return converted < 0.001
        ? converted.toExponential(3)
        : converted.toFixed(6);
    return converted.toString();
  };

  async function fetchAllMetrics() {
    try {
      setLoading(true);
      setMessage(null);
      const response = await makeRequest("/monitoring", { method: "GET" });
      if (response.data.success) {
        const d = response.data.data;
        setData({
          phase: d.phase
            ? { seconds: d.phase.seconds, degrees: d.phase.degrees }
            : null,
          voltage: d.voltage,
          current: d.current,
          power: d.power,
          period: d.period,
          resonance: d.resonance,
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

  async function fetchMetric(metric: keyof MonitoringData) {
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

      if (metric === "resonance") {
        setData((prev) => ({
          ...prev,
          resonance: response.data.resonance,
        }));
        setMessage("✅ Resonance frequency updated");
      } else if (metric === "period") {
        setData((prev) => ({ ...prev, period: response.data.period }));
        setMessage("✅ Period updated");
      } else if (metric === "phase") {
        const p = response.data.phase;
        setData((prev) => ({
          ...prev,
          phase: p ? { seconds: p.seconds, degrees: p.degrees } : null,
        }));
        setMessage("✅ Phase updated");
      } else {
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

  const { running } = useResonanceStatus();
  const isDisabled = !connected || loading || running;

  const renderFrequencyRow = (
    label: string,
    metrics: FrequencyMetrics | null
  ) => {
    if (!metrics) {
      return (
        <div className="frequency-row" key={label}>
          <div className="frequency-cell frequency-label">
            <label>{label}</label>
          </div>
          <div className="frequency-cell">
            <label>Frequency (Hz)</label>
            <input type="text" value="-" readOnly />
          </div>
          <div className="frequency-cell">
            <label>Phase</label>
            <input type="text" value="-" readOnly />
          </div>
          <div className="frequency-cell">
            <label>Current</label>
            <input type="text" value="-" readOnly />
          </div>
        </div>
      );
    }

    return (
      <div className="frequency-row" key={label}>
        <div className="frequency-cell frequency-label">
          <label>{label}</label>
        </div>
        <div className="frequency-cell">
          <label>Frequency (Hz)</label>
          <input
            type="text"
            value={metrics.frequency.toLocaleString()}
            readOnly
          />
        </div>
        <div className="frequency-cell">
          <label>Phase</label>
          <input type="text" value={metrics.phase.toString()} readOnly />
        </div>
        <div className="frequency-cell">
          <label>Current</label>
          <input type="text" value={metrics.current.toString()} readOnly />
        </div>
      </div>
    );
  };

  return (
    <div className="panel">
      <h2>Monitoring Panel</h2>

      {/* PHASE */}
      <div className="monitoring-fieldGroup">
        <label>Phase Difference</label>
        <div className="input-row">
          <div>
            <div className="input-with-unit" style={{ flex: 1 }}>
              <input
                type="text"
                value={formatPhaseTime(data.phase, selectedUnits.phase)}
                readOnly
              />
              <select
                value={selectedUnits.phase}
                onChange={(e) => handleUnitChange("phase", e.target.value)}
                disabled={isDisabled}
              >
                {unitConversions.phase.map((unit) => (
                  <option key={unit.label} value={unit.label}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="input-with-unit">
              <input
                type="text"
                value={formatPhaseAngle(data.phase)}
                readOnly
              />
              <select
                value={phaseAngleUnit}
                onChange={(e) =>
                  handleAngleUnitChange(e.target.value as "deg" | "rad")
                }
                disabled={isDisabled}
              >
                <option value="deg">°</option>
                <option value="rad">rad</option>
              </select>
            </div>
          </div>
        </div>

        {data.phase && (
          <small className="phase-relationship">
            {getPhaseRelationship(data.phase)}
          </small>
        )}
        <button onClick={() => fetchMetric("phase")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* VOLTAGE */}
      <div className="monitoring-fieldGroup">
        <label>Voltage (V)</label>
        <div className="no-unit-input">
          <input
            type="text"
            value={data.voltage !== null ? data.voltage.toFixed(3) : ""}
            readOnly
          />
        </div>
        <button onClick={() => fetchMetric("voltage")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* CURRENT */}
      <div className="monitoring-fieldGroup">
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
            disabled={isDisabled}
          >
            {unitConversions.current.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => fetchMetric("current")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* POWER */}
      <div className="monitoring-fieldGroup">
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
            disabled={isDisabled}
          >
            {unitConversions.power.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => fetchMetric("power")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* PERIOD */}
      <div className="monitoring-fieldGroup">
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
            disabled={isDisabled}
          >
            {unitConversions.period.map((unit) => (
              <option key={unit.label} value={unit.label}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => fetchMetric("period")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* RESONANCE - THREE FREQUENCIES - ALWAYS SHOW GRID */}
      <div className="monitoring-fieldGroup">
        <label>Resonance Frequency</label>
        {data.resonance && <small>Status: {data.resonance.status_text}</small>}
        <div className="frequency-grid">
          {renderFrequencyRow(
            "Best Overall",
            data.resonance?.best_overall ?? null
          )}
          {renderFrequencyRow("Best Phase", data.resonance?.best_phase ?? null)}
          {renderFrequencyRow(
            "Best Current",
            data.resonance?.best_current ?? null
          )}
        </div>
        <button onClick={() => fetchMetric("resonance")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      <div className="buttons">
        <button onClick={fetchAllMetrics} disabled={isDisabled}>
          🔄 Refresh All
        </button>
        <button
          onClick={() => setShowResonanceModal(true)}
          disabled={isDisabled}
        >
          📊 Measure Resonance
        </button>
      </div>

      {!connected && <p className="warning">⚠️ Connect to a device first</p>}
      {message && <p className="message">{message}</p>}

      {showResonanceModal && (
        <ResonanceModal onClose={() => setShowResonanceModal(false)} />
      )}
    </div>
  );
};

export default MonitoringPanel;
