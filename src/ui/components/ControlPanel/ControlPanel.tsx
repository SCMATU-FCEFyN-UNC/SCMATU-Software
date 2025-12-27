import React, { useState, useEffect } from "react";
import "./ControlPanel.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";

const ControlPanel: React.FC = () => {
  const [frequency, setFrequency] = useState<number>(60000);
  const [power, setPower] = useState<number>(50);

  // New states for transducer and timings
  const [transducerEnabled, setTransducerEnabled] = useState<boolean>(true); // initially enabled
  const [onTime, setOnTime] = useState<number>(100);
  const [offTime, setOffTime] = useState<number>(100);

  // Closed loop control state (migrated from DeviceDataPanel)
  const [closedLoopControlEnabled, setClosedLoopControlEnabled] =
    useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();
  const { running } = useResonanceStatus();

  useEffect(() => {
    if (connected) {
      // Fetch initial closed loop state when connected
      handleGetClosedLoopControlEnabled(false);
    }
  }, [connected]);

  // Helper to check if interactions should be disabled
  const isDisabled = !connected || loading || running;

  async function handleSetFrequency() {
    await handleRequest(
      "/frequency",
      { frequency_hz: frequency },
      "Frequency updated"
    );
  }

  async function handleGetFrequency() {
    try {
      setLoading(true);
      const response = await makeRequest("/frequency", { method: "GET" });
      setFrequency(response.data.frequency);
      setMessage(`Frequency read: ${response.data.frequency} Hz`);
    } catch (err) {
      console.error("Failed to get frequency:", err);
      setMessage("❌ Failed to read frequency");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPower() {
    await handleRequest(
      "/power",
      { power_percent: power },
      "Power level updated"
    );
  }

  async function handleToggleTransducer() {
    try {
      setLoading(true);
      setMessage(null);
      const target = !transducerEnabled;
      const response = await makeRequest("/transducer", {
        method: "POST",
        data: { enabled: target },
      });
      if (response.data.success) {
        setTransducerEnabled(Boolean(response.data.enabled ?? target));
        setMessage(`✅ Transducer ${target ? "enabled" : "disabled"}`);
      } else {
        setMessage(`❌ ${response.data.error || "Failed to set transducer"}`);
      }
    } catch (err) {
      console.error("Request failed:", err);
      setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetOnTime() {
    await handleRequest("/on_time", { on_time_ms: onTime }, "On time updated");
  }

  async function handleSetOffTime() {
    await handleRequest(
      "/off_time",
      { off_time_ms: offTime },
      "Off time updated"
    );
  }

  // Closed Loop Control Functions (migrated from DeviceDataPanel)
  const handleGetClosedLoopControlEnabled = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/closed_loop_control", { method: "GET" });
      if (resp.data?.success) {
        setClosedLoopControlEnabled(Boolean(resp.data.closed_loop_enabled));
        if (showMessage) setMessage("✅ Closed loop enabled state fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get closed loop state:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClosedLoopControl = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const target = !closedLoopControlEnabled;
      const response = await makeRequest("/closed_loop_control", {
        method: "POST",
        data: { enabled: target },
      });
      if (response.data.success) {
        setClosedLoopControlEnabled(target);
        setMessage(`✅ Closed loop control ${target ? "enabled" : "disabled"}`);
      } else {
        setMessage(`❌ ${response.data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Request failed:", err);
      setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  async function handleRequest(
    endpoint: string,
    data: object,
    successMsg: string
  ) {
    try {
      setLoading(true);
      setMessage(null);
      const response = await makeRequest(endpoint, {
        method: "POST",
        data,
      });
      if (response.data.success) {
        setMessage(`✅ ${successMsg}`);
      } else {
        setMessage(`❌ ${response.data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Request failed:", err);
      setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="control-panel">
      <div className="control-header">
        <h2>Control Panel</h2>
      </div>

      <div className="control-fields">
        <div className="control-fieldgroup">
          <label>Frequency (Hz)</label>
          <input
            type="number"
            value={frequency}
            disabled={isDisabled}
            onChange={(e) => setFrequency(Number(e.target.value))}
          />
          <div className="control-buttons">
            <button onClick={handleSetFrequency} disabled={isDisabled}>
              Set
            </button>
            <button onClick={handleGetFrequency} disabled={isDisabled}>
              Get
            </button>
          </div>
        </div>

        <div className="control-fieldgroup">
          <label>Power Level (%)</label>
          <input
            type="number"
            value={power}
            min={0}
            max={100}
            disabled={isDisabled}
            onChange={(e) => setPower(Number(e.target.value))}
          />
          <button onClick={handleSetPower} disabled={isDisabled}>
            Set
          </button>
        </div>

        {/* Transducer enable/disable toggle */}
        <div className="control-transducer-enabler">
          <label>Transducer Status:</label>
          <span>{transducerEnabled ? "Enabled" : "Disabled"}</span>
          <button onClick={handleToggleTransducer} disabled={isDisabled}>
            {transducerEnabled ? "Disable" : "Enable"}
          </button>
        </div>

        {/* On time (ms) */}
        <div className="control-fieldgroup">
          <label>On Time (ms)</label>
          <input
            type="number"
            value={onTime}
            min={0}
            disabled={isDisabled}
            onChange={(e) => setOnTime(Number(e.target.value))}
          />
          <button onClick={handleSetOnTime} disabled={isDisabled}>
            Set
          </button>
        </div>

        {/* Off time (ms) */}
        <div className="control-fieldgroup">
          <label>Off Time (ms)</label>
          <input
            type="number"
            value={offTime}
            min={0}
            disabled={isDisabled}
            onChange={(e) => setOffTime(Number(e.target.value))}
          />
          <button onClick={handleSetOffTime} disabled={isDisabled}>
            Set
          </button>
        </div>

        {/* Closed Loop Control (migrated from DeviceDataPanel) */}
        <div className="control-closed-loop-status">
          <label>Closed Loop Control</label>
          <div className="control-closed-loop-fields">
            <label>Status:</label>
            <span>{closedLoopControlEnabled ? "Enabled" : "Disabled"}</span>
            <button
              onClick={handleToggleClosedLoopControl}
              disabled={isDisabled}
              style={{ marginRight: "8px" }}
            >
              {closedLoopControlEnabled
                ? "Disable Closed Loop"
                : "Enable Closed Loop"}
            </button>
            <button
              onClick={() => handleGetClosedLoopControlEnabled()}
              disabled={isDisabled}
            >
              Update
            </button>
          </div>
        </div>
        <div className="control-panel-warning">
          {!connected && (
            <p className="control-panel-warning">
              ⚠️ Connect to a device first
            </p>
          )}
        </div>
        <div className="control-panel-message">
          {message && <p className="control-panel-messagee">{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
