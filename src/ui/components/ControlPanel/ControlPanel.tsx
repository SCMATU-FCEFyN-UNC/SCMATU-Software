import React, { useState } from "react";
import "./ControlPanel.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";

const ControlPanel: React.FC = () => {
  const [frequency, setFrequency] = useState<number>(60000);
  const [power, setPower] = useState<number>(50);
  const [samples, setSamples] = useState<number>(100);
  const [step, setStep] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();
  const { running } = useResonanceStatus();

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

  async function handleSetSamples() {
    await handleRequest(
      "/samples",
      { sample_count: samples },
      "Sample count updated"
    );
  }

  async function handleSetStep() {
    await handleRequest(
      "/frequency-step",
      { step_hz: step },
      "Frequency step updated"
    );
  }

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
    <div className="panel">
      <h2>Control Panel</h2>

      <div className="fieldGroup">
        <label>Frequency (Hz)</label>
        <input
          type="number"
          value={frequency}
          disabled={isDisabled}
          onChange={(e) => setFrequency(Number(e.target.value))}
        />
        <div className="buttons">
          <button onClick={handleSetFrequency} disabled={isDisabled}>
            Set
          </button>
          <button onClick={handleGetFrequency} disabled={isDisabled}>
            Get
          </button>
        </div>
      </div>

      <div className="fieldGroup">
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

      <div className="fieldGroup">
        <label>Sample Count</label>
        <input
          type="number"
          value={samples}
          min={1}
          disabled={isDisabled}
          onChange={(e) => setSamples(Number(e.target.value))}
        />
        <button onClick={handleSetSamples} disabled={isDisabled}>
          Set
        </button>
      </div>

      <div className="fieldGroup">
        <label>Frequency Step (Hz)</label>
        <input
          type="number"
          value={step}
          min={1}
          disabled={isDisabled}
          onChange={(e) => setStep(Number(e.target.value))}
        />
        <button onClick={handleSetStep} disabled={isDisabled}>
          Set
        </button>
      </div>
      {!connected && <p className="warning">⚠️ Connect to a device first</p>}
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default ControlPanel;
