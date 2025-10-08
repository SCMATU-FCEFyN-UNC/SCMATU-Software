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

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();

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
        <label>Phase Difference (ns)</label>
        <input type="text" value={data.phase ?? ""} readOnly />
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
        <label>Current (A)</label>
        <input
          type="text"
          value={data.current !== null ? data.current.toFixed(4) : ""}
          readOnly
        />
        <button
          onClick={() => fetchMetric("current")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Power (VA)</label>
        <input
          type="text"
          value={data.power !== null ? data.power.toFixed(3) : ""}
          readOnly
        />
        <button
          onClick={() => fetchMetric("power")}
          disabled={!connected || loading}
        >
          Refresh
        </button>
      </div>

      <div className="fieldGroup">
        <label>Signal Period (s)</label>
        <input
          type="text"
          value={data.period !== null ? data.period.toExponential(3) : ""}
          readOnly
        />
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
