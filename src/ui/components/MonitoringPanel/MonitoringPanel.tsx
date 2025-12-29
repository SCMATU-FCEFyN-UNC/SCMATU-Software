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
  phase_ns: number | null; // New: phase in nanoseconds
  phase_deg: number | null; // New: phase in degrees
  current: number | null; // This is now in Amps, not ADC
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

      // Special handling for power: fetch voltage and current first
      if (metric === "power") {
        try {
          // Fetch voltage first
          const voltageResponse = await makeRequest(`/monitoring/voltage`, {
            method: "GET",
          });

          if (!voltageResponse.data.success) {
            setMessage(
              `❌ ${voltageResponse.data.error || "Failed to fetch voltage"}`
            );
            return;
          }

          // Fetch current next
          const currentResponse = await makeRequest(`/monitoring/current`, {
            method: "GET",
          });

          if (!currentResponse.data.success) {
            setMessage(
              `❌ ${currentResponse.data.error || "Failed to fetch current"}`
            );
            return;
          }

          // Now fetch power (which will use the freshly fetched voltage and current)
          const powerResponse = await makeRequest(`/monitoring/power`, {
            method: "GET",
          });

          if (!powerResponse.data.success) {
            setMessage(
              `❌ ${powerResponse.data.error || "Failed to fetch power"}`
            );
            return;
          }

          // Update all three values
          setData((prev) => ({
            ...prev,
            voltage: voltageResponse.data.voltage,
            current: currentResponse.data.current,
            power: powerResponse.data.power,
          }));

          setMessage("✅ Voltage, Current, and Power updated");
        } catch (err) {
          console.error("Failed to fetch power with dependencies:", err);
          setMessage("❌ Failed to fetch power with dependencies");
        } finally {
          setLoading(false);
        }
        return; // Exit early since we handled power specially
      }

      // Original handling for other metrics
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

  const [isResonanceCollapsed, setIsResonanceCollapsed] = useState(true);

  const renderFrequencyRow = (
    label: string,
    metrics: FrequencyMetrics | null,
    isCollapsed: boolean = false
  ) => {
    // If collapsed and this is not "Best Overall", don't render
    if (isCollapsed && label !== "Best Overall") {
      return null;
    }

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
          {/* Mobile/Medium: phase and current in same row */}
          <div className="phase-current-container">
            <div className="frequency-cell">
              <label>Phase</label>
              <input type="text" value="-" readOnly />
            </div>
            <div className="frequency-cell">
              <label>Current</label>
              <input type="text" value="-" readOnly />
            </div>
          </div>
          {/* Desktop: individual cells */}
          <div className="frequency-cell phase-cell">
            <label>Phase</label>
            <input type="text" value="-" readOnly />
          </div>
          <div className="frequency-cell current-cell">
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
        {/* Mobile/Medium: phase and current in same row */}
        <div className="phase-current-container">
          <div className="frequency-cell">
            <label>Phase (deg)</label>
            <input
              type="text"
              value={
                metrics.phase_deg !== null
                  ? metrics.phase_deg.toFixed(2) + "°"
                  : "-"
              }
              readOnly
            />
          </div>
          <div className="frequency-cell">
            <label>Current</label>
            <input
              type="text"
              value={
                metrics.current !== null
                  ? metrics.current.toFixed(4) + " A"
                  : "-"
              }
              readOnly
            />
          </div>
        </div>
        {/* Desktop: individual cells */}
        <div className="frequency-cell phase-cell">
          <label>Phase (deg)</label>
          <input
            type="text"
            value={
              metrics.phase_deg !== null
                ? metrics.phase_deg.toFixed(2) + "°"
                : "-"
            }
            readOnly
          />
        </div>
        <div className="frequency-cell current-cell">
          <label>Current</label>
          <input
            type="text"
            value={
              metrics.current !== null ? metrics.current.toFixed(4) + " A" : "-"
            }
            readOnly
          />
        </div>
      </div>
    );
  };

  return (
    <div className="monitoring-panel">
      <div className="monitoring-header">
        <h2>Monitoring Panel</h2>
      </div>

      {/* PHASE DIFFERENCE - Special row that stays together */}
      <div className="monitoring-fieldgroup phase-difference">
        <label>Phase Difference</label>
        <div className="phase-inputs-container">
          <div className="input-with-unit">
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

          <div className="input-with-unit">
            <input type="text" value={formatPhaseAngle(data.phase)} readOnly />
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

          {data.phase && (
            <small className="phase-relationship">
              {getPhaseRelationship(data.phase)}
            </small>
          )}
        </div>
        <button onClick={() => fetchMetric("phase")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* MONITORING FIELDS - Grid layout */}
      <div className="monitoring-fields">
        {/* VOLTAGE */}
        <div className="monitoring-fieldgroup">
          <label>Voltage (V)</label>
          <input
            type="text"
            value={data.voltage !== null ? data.voltage.toFixed(3) : ""}
            readOnly
          />
          <button onClick={() => fetchMetric("voltage")} disabled={isDisabled}>
            Refresh
          </button>
        </div>

        {/* CURRENT */}
        <div className="monitoring-fieldgroup">
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
        <div className="monitoring-fieldgroup">
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
        <div className="monitoring-fieldgroup">
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
      </div>

      {/* RESONANCE FREQUENCY - Collapsible */}
      <div className="monitoring-fieldgroup resonance-section">
        <div className="resonance-header">
          <label>Resonance Frequency</label>
          {data.resonance && (
            <small>Status: {data.resonance.status_text}</small>
          )}
        </div>

        <div className="frequency-grid">
          {/* Always show Best Overall */}
          {renderFrequencyRow(
            "Best Overall",
            data.resonance?.best_overall ?? null
          )}

          {/* Conditionally show Best Phase and Best Current */}
          {!isResonanceCollapsed && (
            <>
              {renderFrequencyRow(
                "Best Phase",
                data.resonance?.best_phase ?? null
              )}
              {renderFrequencyRow(
                "Best Current",
                data.resonance?.best_current ?? null
              )}
            </>
          )}

          {/* Arrow at bottom of frequency grid */}
          <div
            className="frequency-toggle"
            onClick={() => setIsResonanceCollapsed(!isResonanceCollapsed)}
          >
            <span
              className={`arrow ${isResonanceCollapsed ? "down" : "up"}`}
            ></span>
          </div>
        </div>

        <button onClick={() => fetchMetric("resonance")} disabled={isDisabled}>
          Refresh
        </button>
      </div>

      {/* ACTION BUTTONS */}
      <div className="monitoring-actions">
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

      {/* MESSAGES */}
      {!connected && <p className="warning">⚠️ Connect to a device first</p>}
      {message && <p className="message">{message}</p>}

      {/* MODAL */}
      {showResonanceModal && (
        <ResonanceModal onClose={() => setShowResonanceModal(false)} />
      )}
    </div>
  );
};

export default MonitoringPanel;
