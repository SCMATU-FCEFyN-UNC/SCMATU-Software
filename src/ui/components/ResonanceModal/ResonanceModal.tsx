import React, { useState, useEffect } from "react";
import "./ResonanceModal.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";

const ResonanceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [rangeStart, setRangeStart] = useState<number>(20000);
  const [rangeEnd, setRangeEnd] = useState<number>(140000);
  const [step, setStep] = useState<number>(10);
  const [stabilizeS, setStabilizeS] = useState<number>(0.15);
  const [mode, setMode] = useState<"firmware" | "software">("firmware");
  const [message, setMessage] = useState<string | null>(null);
  const [firmwareUpdateStatus, setFirmwareUpdateStatus] = useState<
    string | null
  >(null);

  // New state for obtained frequency results with all fields
  const [obtainedFrequencies, setObtainedFrequencies] = useState<{
    best_overall: {
      frequency: number;
      phase_ns: number | null;
      phase_deg: number | null;
      current: number;
    } | null;
    best_phase: {
      frequency: number;
      phase_ns: number | null;
      phase_deg: number | null;
      current: number;
    } | null;
    best_current: {
      frequency: number;
      phase_ns: number | null;
      phase_deg: number | null;
      current: number;
    } | null;
  }>({
    best_overall: null,
    best_phase: null,
    best_current: null,
  });

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();
  const { running, setRunning, statusText, setStatusText } =
    useResonanceStatus();

  // Function to extract results from status response (for BOTH firmware and software modes)
  const extractResultsFromStatus = (statusData: any) => {
    const transformResult = (result: any) => {
      if (!result) return null;

      // Handle all possible field naming conventions
      return {
        frequency: result.frequency || null,
        phase_ns:
          result.phase !== undefined
            ? result.phase
            : result.phase_ns !== undefined
            ? result.phase_ns
            : null,
        phase_deg: result.phase_deg !== undefined ? result.phase_deg : null,
        current:
          result.current !== undefined
            ? result.current
            : result.current_a !== undefined
            ? result.current_a
            : null,
      };
    };

    // Check if results are in the expected format
    if (
      statusData.best_overall ||
      statusData.best_phase ||
      statusData.best_current
    ) {
      setObtainedFrequencies({
        best_overall: transformResult(statusData.best_overall),
        best_phase: transformResult(statusData.best_phase),
        best_current: transformResult(statusData.best_current),
      });
      return true; // Results were found and extracted
    }
    return false; // No results found
  };

  // Function to check for existing results (used on initial load and mode switch)
  const checkExistingResults = async () => {
    try {
      const res = await makeRequest("/resonance/status", { method: "GET" });
      const { status_code, status_text, ...otherData } = res.data;

      // Try to extract results from the status response
      const hasResults = extractResultsFromStatus(otherData);

      // If no results in status response but we have firmware data, try the old endpoint
      if (!hasResults && mode === "firmware" && status_code === 1) {
        // Fallback to old monitoring endpoint for backward compatibility
        try {
          const monitoringRes = await makeRequest("/monitoring/resonance", {
            method: "GET",
          });
          if (monitoringRes.data && monitoringRes.data.success) {
            const resonanceData =
              monitoringRes.data.resonance ||
              monitoringRes.data.data?.resonance;
            if (resonanceData) {
              // Transform old format to new format
              setObtainedFrequencies({
                best_overall: resonanceData.best_overall
                  ? {
                      frequency: resonanceData.best_overall.frequency,
                      phase_ns: resonanceData.best_overall.phase,
                      phase_deg: null,
                      current: resonanceData.best_overall.current,
                    }
                  : null,
                best_phase: resonanceData.best_phase
                  ? {
                      frequency: resonanceData.best_phase.frequency,
                      phase_ns: resonanceData.best_phase.phase,
                      phase_deg: null,
                      current: resonanceData.best_phase.current,
                    }
                  : null,
                best_current: resonanceData.best_current
                  ? {
                      frequency: resonanceData.best_current.frequency,
                      phase_ns: resonanceData.best_current.phase,
                      phase_deg: null,
                      current: resonanceData.best_current.current,
                    }
                  : null,
              });
            }
          }
        } catch (monitoringErr) {
          console.error(
            "Error fetching from monitoring endpoint:",
            monitoringErr
          );
        }
      }
    } catch (err) {
      console.error("Error checking existing results:", err);
    }
  };

  // Polling for status and update obtained frequencies when measurement completes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) {
      // Clear firmware update status when starting new measurement
      setFirmwareUpdateStatus(null);

      interval = setInterval(async () => {
        try {
          const res = await makeRequest("/resonance/status", { method: "GET" });
          const { status_code, status_text, ...otherData } = res.data;
          setStatusText(status_text);

          // Extract results if available in the response (for BOTH modes now)
          extractResultsFromStatus(otherData);

          if (status_code === 1 || status_code === 2) {
            setRunning(false);
            clearInterval(interval);

            const successMessage =
              status_code === 1
                ? "✅ Resonance frequency obtained successfully!"
                : "❌ Failed to obtain resonance frequency.";

            // Add firmware update info for software mode
            if (status_code === 1 && mode === "software") {
              setFirmwareUpdateStatus(
                "Updating firmware with resonance frequency..."
              );

              // The backend should have already updated the firmware automatically
              // but we can display a confirmation message after a delay
              setTimeout(() => {
                setFirmwareUpdateStatus(
                  "✓ Firmware updated with resonance frequency"
                );
              }, 1000);
            }

            setMessage(successMessage);

            // For firmware mode, make sure we have the latest results
            if (status_code === 1 && mode === "firmware") {
              // Results should already be extracted above, but double-check
              const hasResults = extractResultsFromStatus(otherData);
              if (!hasResults) {
                // If no results in immediate response, check again after a short delay
                setTimeout(() => {
                  checkExistingResults();
                }, 1000);
              }
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    } else {
      // On initial load, check for existing results
      checkExistingResults();
    }
    return () => clearInterval(interval);
  }, [running, mode]);

  async function handleStartMeasurement() {
    if (!connected || running) return;
    try {
      setMessage(null);
      setStatusText("Starting measurement...");
      setRunning(true);
      // Clear previous results
      setObtainedFrequencies({
        best_overall: null,
        best_phase: null,
        best_current: null,
      });

      if (mode === "software") {
        // Start software sweep: send all params in one request and return immediately
        const response = await makeRequest("/resonance/start", {
          method: "POST",
          data: {
            mode: "software",
            frequency_range_start: rangeStart,
            frequency_range_end: rangeEnd,
            frequency_step: step,
            stabilize_s: stabilizeS,
          },
        });

        if (response.data && response.data.success) {
          setStatusText("Measurement in progress...");
          // polling effect will handle completion messages and results
        } else {
          setStatusText("Error starting measurement");
          setRunning(false);
        }
      } else {
        // Firmware-based: keep existing behaviour (set registers then trigger)
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
        if (response.data && response.data.success) {
          setStatusText("Measurement in progress...");
        } else {
          setStatusText("Error starting measurement");
          setRunning(false);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setStatusText("Error starting measurement");
      setRunning(false);
    }
  }

  // Helper function to format frequency values
  const formatFrequency = (freq: number | null | undefined): string => {
    if (freq === null || freq === undefined) return "N/A";
    return `${freq.toLocaleString()} Hz`;
  };

  // Helper function to format phase values in ns
  const formatPhaseNs = (phase: number | null | undefined): string => {
    if (phase === null || phase === undefined) return "N/A";
    return `${phase.toFixed(2)} ns`;
  };

  // Helper function to format phase values in degrees
  const formatPhaseDeg = (phase: number | null | undefined): string => {
    if (phase === null || phase === undefined) return "N/A";
    return `${phase.toFixed(2)}°`;
  };

  // Helper function to format current values
  const formatCurrent = (current: number | null | undefined): string => {
    if (current === null || current === undefined) return "N/A";
    return `${current.toFixed(4)} A`;
  };

  // Function to render a frequency card with 2×2 grid
  const renderFrequencyCard = (
    title: string,
    data: {
      frequency: number | null;
      phase_ns: number | null;
      phase_deg: number | null;
      current: number | null;
    } | null
  ) => (
    <div className="frequency-card">
      <h4>{title}</h4>
      <div className="frequency-grid-2x2">
        <div className="frequency-field">
          <label>Frequency:</label>
          <input
            type="text"
            value={formatFrequency(data?.frequency)}
            readOnly
            className="readonly-field"
          />
        </div>
        <div className="frequency-field">
          <label>Phase (ns):</label>
          <input
            type="text"
            value={formatPhaseNs(data?.phase_ns)}
            readOnly
            className="readonly-field"
          />
        </div>
        <div className="frequency-field">
          <label>Phase (deg):</label>
          <input
            type="text"
            value={formatPhaseDeg(data?.phase_deg)}
            readOnly
            className="readonly-field"
          />
        </div>
        <div className="frequency-field">
          <label>Current:</label>
          <input
            type="text"
            value={formatCurrent(data?.current)}
            readOnly
            className="readonly-field"
          />
        </div>
      </div>
    </div>
  );

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

        <fieldset className="fieldGroup">
          <legend>Measurement Mode</legend>

          <label>
            <input
              type="radio"
              name="resonance-mode"
              value="firmware"
              checked={mode === "firmware"}
              onChange={() => {
                setMode("firmware");
                // Clear any previous software results when switching to firmware mode
                setObtainedFrequencies({
                  best_overall: null,
                  best_phase: null,
                  best_current: null,
                });
                checkExistingResults();
              }}
              disabled={running}
            />
            Firmware (device internal sweep)
          </label>

          <label style={{ marginLeft: 12 }}>
            <input
              type="radio"
              name="resonance-mode"
              value="software"
              checked={mode === "software"}
              onChange={() => {
                setMode("software");
                checkExistingResults();
              }}
              disabled={running}
            />
            Software (backend-driven sweep)
          </label>
        </fieldset>

        {mode === "software" && (
          <div className="fieldGroup">
            <label htmlFor="stabilize-s">
              Stabilization delay per step (s)
            </label>
            <input
              id="stabilize-s"
              type="number"
              step="0.01"
              min="0"
              value={stabilizeS}
              onChange={(e) => setStabilizeS(Number(e.target.value))}
              disabled={running}
            />
            <small>
              Time to wait after setting frequency before reading (default
              0.15s)
            </small>
          </div>
        )}

        {/* Obtained Frequencies Section */}
        <div className="obtained-frequencies-section">
          <h3>Obtained Resonance Frequencies</h3>
          <p className="mode-indicator">
            <small>
              Mode: {mode === "firmware" ? "Firmware-based" : "Software-based"}
            </small>
          </p>

          <div className="frequency-cards-grid">
            {renderFrequencyCard(
              "Best Overall",
              obtainedFrequencies.best_overall
            )}
            {renderFrequencyCard("Best Phase", obtainedFrequencies.best_phase)}
            {renderFrequencyCard(
              "Best Current",
              obtainedFrequencies.best_current
            )}
          </div>
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

        {/* Add firmware update status display here */}
        {firmwareUpdateStatus && (
          <p
            className={`firmware-update-status ${
              firmwareUpdateStatus.includes("✓") ? "success" : "info"
            }`}
          >
            {firmwareUpdateStatus}
          </p>
        )}

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
