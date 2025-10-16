import React, { useState, useEffect } from "react";
import "./ResonanceModal.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";

const ResonanceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [rangeStart, setRangeStart] = useState<number>(20000);
  const [rangeEnd, setRangeEnd] = useState<number>(140000);
  const [step, setStep] = useState<number>(10);
  const [message, setMessage] = useState<string | null>(null);

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();
  const { running, setRunning, statusText, setStatusText } =
    useResonanceStatus();

  // Polling for status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) {
      interval = setInterval(async () => {
        try {
          const res = await makeRequest("/resonance/status", { method: "GET" });
          const { status_code, status_text } = res.data;
          setStatusText(status_text);

          if (status_code === 1 || status_code === 2) {
            setRunning(false);
            clearInterval(interval);
            setMessage(
              status_code === 1
                ? "✅ Resonance frequency obtained successfully!"
                : "❌ Failed to obtain resonance frequency."
            );
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [running]);

  async function handleStartMeasurement() {
    if (!connected || running) return;
    try {
      setMessage(null);
      setStatusText("Starting measurement...");
      setRunning(true);

      await makeRequest("/resonance/frequency/start", {
        method: "POST",
        data: { frequency_range_start: rangeStart },
      });
      await makeRequest("/resonance/frequency/end", {
        method: "POST",
        data: { frequency_range_end: rangeEnd },
      });
      await makeRequest("/resonance/frequency/step", {
        method: "POST",
        data: { frequency_step: step },
      });

      const response = await makeRequest("/resonance/start", {
        method: "POST",
      });
      if (response.data.success) {
        setStatusText("Measurement in progress...");
      } else {
        setStatusText("Error starting measurement");
        setRunning(false);
      }
    } catch (err) {
      console.error("Error:", err);
      setStatusText("Error starting measurement");
      setRunning(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="panel resonance-modal">
        <h2>Resonance Measurement</h2>

        <div className="fieldGroup">
          <label htmlFor="range-start">Frequency Range Start (Hz)</label>
          <input
            id="range-start"
            type="number"
            value={rangeStart}
            onChange={(e) => setRangeStart(Number(e.target.value))}
            disabled={running}
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="range-end">Frequency Range End (Hz)</label>
          <input
            id="range-end"
            type="number"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(Number(e.target.value))}
            disabled={running}
          />
        </div>

        <div className="fieldGroup">
          <label htmlFor="step">Frequency Step (Hz)</label>
          <input
            id="step"
            type="number"
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            disabled={running}
          />
        </div>

        <div className="status-section">
          <p>
            <strong>Status:</strong> {statusText}
          </p>
          {running && (
            <div className="loading-indicator">
              <div className="spinner" data-testid="loading-spinner" />
              <p>This process may take several minutes. Please wait...</p>
            </div>
          )}
        </div>

        {message && <p className="message">{message}</p>}

        <div className="buttons">
          <button
            onClick={handleStartMeasurement}
            disabled={!connected || running}
          >
            Start Measurement
          </button>
          <button onClick={onClose} disabled={running}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResonanceModal;
