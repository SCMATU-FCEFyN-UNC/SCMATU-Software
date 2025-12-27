import React, { useState, useEffect, useRef } from "react";
import "./ResonanceModal.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";

const ResonanceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Initialize state from sessionStorage with defaults
  const [rangeStart, setRangeStart] = useState<number>(() => {
    const saved = sessionStorage.getItem("resonanceRangeStart");
    return saved ? parseInt(saved, 10) : 20000;
  });
  const [rangeEnd, setRangeEnd] = useState<number>(() => {
    const saved = sessionStorage.getItem("resonanceRangeEnd");
    return saved ? parseInt(saved, 10) : 140000;
  });
  const [step, setStep] = useState<number>(() => {
    const saved = sessionStorage.getItem("resonanceStep");
    return saved ? parseInt(saved, 10) : 10;
  });
  const [stabilizeS, setStabilizeS] = useState<number>(() => {
    const saved = sessionStorage.getItem("resonanceStabilizeS");
    return saved ? parseFloat(saved) : 0.15;
  });
  const [mode, setMode] = useState<"firmware" | "software">(() => {
    const saved = sessionStorage.getItem("resonanceMode");
    return saved === "software" || saved === "firmware" ? saved : "firmware";
  });

  // New state for plot options
  const [livePlot, setLivePlot] = useState<boolean>(() => {
    const saved = sessionStorage.getItem("resonanceLivePlot");
    return saved ? JSON.parse(saved) : true; // Default to true (show plot)
  });
  const [savePlot, setSavePlot] = useState<boolean>(() => {
    const saved = sessionStorage.getItem("resonanceSavePlot");
    return saved ? JSON.parse(saved) : false; // Default to false
  });

  const [message, setMessage] = useState<string | null>(null);
  const [firmwareUpdateStatus, setFirmwareUpdateStatus] = useState<
    string | null
  >(null);

  // New state for save options
  const [saveResults, setSaveResults] = useState<boolean>(false);
  const [saveFolderPath, setSaveFolderPath] = useState<string | null>(() => {
    // Initialize from sessionStorage if available
    return sessionStorage.getItem("resonanceSaveFolderPath");
  });
  const [isSelectingFolder, setIsSelectingFolder] = useState<boolean>(false);

  const [plotOpen, setPlotOpen] = useState<boolean>(false);
  const resultsSavedRef = useRef<boolean>(false);
  const plotSavedRef = useRef<boolean>(false);
  const firmwareUpdatedRef = useRef<boolean>(false);
  const measurementCompletedRef = useRef<boolean>(false);

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

  // Save state to sessionStorage whenever values change
  useEffect(() => {
    sessionStorage.setItem("resonanceRangeStart", rangeStart.toString());
  }, [rangeStart]);

  useEffect(() => {
    sessionStorage.setItem("resonanceRangeEnd", rangeEnd.toString());
  }, [rangeEnd]);

  useEffect(() => {
    sessionStorage.setItem("resonanceStep", step.toString());
  }, [step]);

  useEffect(() => {
    sessionStorage.setItem("resonanceStabilizeS", stabilizeS.toString());
  }, [stabilizeS]);

  useEffect(() => {
    sessionStorage.setItem("resonanceMode", mode);
  }, [mode]);

  // Save plot options to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("resonanceLivePlot", JSON.stringify(livePlot));
  }, [livePlot]);

  useEffect(() => {
    sessionStorage.setItem("resonanceSavePlot", JSON.stringify(savePlot));
  }, [savePlot]);

  // Function to open folder selection dialog
  const selectSaveFolder = async () => {
    if (isSelectingFolder) return;

    setIsSelectingFolder(true);
    try {
      const response = await makeRequest("/select-folder", {
        method: "GET",
      });

      if (response.data && response.data.status === "success") {
        const folderPath = response.data.folder;
        setSaveFolderPath(folderPath);
        setSaveResults(true);

        // Store in sessionStorage for persistence during app session
        sessionStorage.setItem("resonanceSaveFolderPath", folderPath);
      } else {
        // Only clear folder if user explicitly cancels and no folder was previously set
        if (!saveFolderPath) {
          setSaveFolderPath(null);
          setSaveResults(false);
        }
        // If user cancels but we already have a folder, keep it
        setMessage("❌ No folder selected. Keeping previous folder.");
      }
    } catch (err) {
      console.error("Error selecting folder:", err);
      // Don't clear existing folder on error
      if (!saveFolderPath) {
        setSaveFolderPath(null);
        setSaveResults(false);
      }
      setMessage(
        "❌ Error selecting folder. Keeping previous folder if available."
      );
    } finally {
      setIsSelectingFolder(false);
    }
  };

  // Clear saved folder when switching to firmware mode
  const handleModeChangeToFirmware = () => {
    setMode("firmware");
    // Clear any previous software results when switching to firmware mode
    setObtainedFrequencies({
      best_overall: null,
      best_phase: null,
      best_current: null,
    });
    // Disable save results and plot options for firmware mode
    setSaveResults(false);
    setLivePlot(false);
    setSavePlot(false);
    // Don't clear folder path - keep it for next time
    checkExistingResults();
  };

  // Initialize saveResults based on whether we have a saved folder
  useEffect(() => {
    if (mode === "software" && saveFolderPath) {
      setSaveResults(true);
    }
  }, [mode, saveFolderPath]);

  // Initialize plot options when switching to software mode
  useEffect(() => {
    if (mode === "software") {
      // Enable live plot by default for software mode
      if (sessionStorage.getItem("resonanceLivePlot") === null) {
        setLivePlot(true);
      }
    }
  }, [mode]);

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
    if (running || plotOpen) {
      // Clear firmware update status when starting new measurement
      setFirmwareUpdateStatus(null);

      interval = setInterval(async () => {
        try {
          const res = await makeRequest("/resonance/status", { method: "GET" });
          const { status_code, status_text, ...otherData } = res.data;
          setStatusText(status_text);
          setPlotOpen(otherData.plot_open || false);

          // Stop polling if measurement is done and plot is closed
          if (!running && !(otherData.plot_open || false)) {
            clearInterval(interval);
          }

          // Extract results if available in the response (for BOTH modes now)
          extractResultsFromStatus(otherData);

          if (status_code === 1 || status_code === 2) {
            if (!measurementCompletedRef.current) {
              setRunning(false);

              const successMessage =
                status_code === 1
                  ? "✅ Resonance frequency obtained successfully!"
                  : "❌ Failed to obtain resonance frequency.";

              // Add plot information for software mode
              if (status_code === 1 && mode === "software") {
                if (livePlot) {
                  setMessage((prev) =>
                    prev
                      ? prev +
                        "\n📊 Plot window is open. Close it manually when done."
                      : "📊 Plot window is open. Close it manually when done."
                  );
                }

                if (
                  savePlot &&
                  otherData.plot_filepath &&
                  !plotSavedRef.current
                ) {
                  setMessage((prev) =>
                    prev
                      ? prev + `\n🖼️ Plot saved to: ${otherData.plot_filepath}`
                      : `🖼️ Plot saved to: ${otherData.plot_filepath}`
                  );
                  plotSavedRef.current = true;
                }

                // Add firmware update info
                if (!firmwareUpdatedRef.current) {
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
                  firmwareUpdatedRef.current = true;
                }

                // Save results to CSV if requested
                if (
                  saveResults &&
                  saveFolderPath &&
                  otherData.results &&
                  !resultsSavedRef.current
                ) {
                  try {
                    const saveResponse = await makeRequest(
                      "/resonance/save-results",
                      {
                        method: "POST",
                        data: {
                          folder_path: saveFolderPath,
                          results: otherData.results,
                          best_overall: otherData.best_overall,
                          best_phase: otherData.best_phase,
                          best_current: otherData.best_current,
                          plot_filepath: otherData.plot_filepath,
                          sweep_params: {
                            start: rangeStart,
                            end: rangeEnd,
                            step: step,
                            stabilize_s: stabilizeS,
                            live_plot: livePlot,
                            save_plot: savePlot,
                          },
                        },
                      }
                    );

                    if (saveResponse.data && saveResponse.data.success) {
                      setMessage(
                        (prev) =>
                          prev +
                          `\n📁 Results saved to: ${saveResponse.data.filename}`
                      );
                    }
                  } catch (saveErr) {
                    console.error("Error saving results:", saveErr);
                    setMessage(
                      (prev) => prev + "\n❌ Failed to save results to CSV."
                    );
                  }
                  resultsSavedRef.current = true;
                }
              }

              setMessage((prev) =>
                prev ? prev + "\n" + successMessage : successMessage
              );

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
              measurementCompletedRef.current = true;
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    } else {
      // On initial load, check for existing results
      if (!running && !plotOpen) {
        checkExistingResults();
      }
    }
    return () => clearInterval(interval);
  }, [
    running,
    plotOpen,
    mode,
    saveResults,
    saveFolderPath,
    livePlot,
    savePlot,
  ]);

  async function handleStartMeasurement() {
    if (!connected || running || plotOpen) return;

    // For software mode with save enabled, ensure folder is selected
    if (mode === "software" && saveResults && !saveFolderPath) {
      setMessage("⚠️ Please select a save folder first.");
      // Don't auto-open folder selector - let user click the button
      return;
    }

    // For software mode with save plot enabled, ensure folder is selected
    if (mode === "software" && savePlot && !saveFolderPath) {
      setMessage("⚠️ Please select a save folder to save the plot.");
      return;
    }

    try {
      setMessage(null);
      setStatusText("Starting measurement...");
      setRunning(true);
      resultsSavedRef.current = false;
      plotSavedRef.current = false;
      firmwareUpdatedRef.current = false;
      measurementCompletedRef.current = false;
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
            save_results: saveResults, // Pass save preference to backend
            save_folder_path: saveFolderPath, // Pass folder path if selected
            live_plot: livePlot, // Pass live plot preference
            save_plot: savePlot, // Pass save plot preference
          },
        });

        if (response.data && response.data.success) {
          setStatusText("Measurement in progress...");
          // Show message about plot if enabled
          if (livePlot) {
            setMessage("📊 Live plot will open in a separate window...");
          }
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
    <div className="resonance-frequency-card">
      <h4>{title}</h4>
      <div className="resonance-frequency-grid-2x2">
        <div className="resonance-frequency-field">
          <label>Frequency:</label>
          <input
            type="text"
            value={formatFrequency(data?.frequency)}
            readOnly
            className="resonance-readonly-field"
          />
        </div>
        <div className="resonance-frequency-field">
          <label>Phase (ns):</label>
          <input
            type="text"
            value={formatPhaseNs(data?.phase_ns)}
            readOnly
            className="resonance-readonly-field"
          />
        </div>
        <div className="resonance-frequency-field">
          <label>Phase (deg):</label>
          <input
            type="text"
            value={formatPhaseDeg(data?.phase_deg)}
            readOnly
            className="resonance-readonly-field"
          />
        </div>
        <div className="resonance-frequency-field">
          <label>Current:</label>
          <input
            type="text"
            value={formatCurrent(data?.current)}
            readOnly
            className="resonance-readonly-field"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="panel resonance-modal">
        <h2>Resonance Measurement</h2>

        <div className="resonance-field-group">
          <label htmlFor="range-start" className="resonance-field-label">
            Frequency Range Start (Hz)
            <button
              type="button"
              className="resonance-reset-field-button"
              onClick={() => setRangeStart(20000)}
              title="Reset to default (20000)"
              disabled={running}
            >
              ↺
            </button>
          </label>
          <input
            id="range-start"
            type="number"
            value={rangeStart}
            onChange={(e) => setRangeStart(Number(e.target.value))}
            disabled={running}
            className="resonance-field-input"
          />
        </div>

        <div className="resonance-field-group">
          <label htmlFor="range-end" className="resonance-field-label">
            Frequency Range End (Hz)
            <button
              type="button"
              className="resonance-reset-field-button"
              onClick={() => setRangeEnd(140000)}
              title="Reset to default (140000)"
              disabled={running}
            >
              ↺
            </button>
          </label>
          <input
            id="range-end"
            type="number"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(Number(e.target.value))}
            disabled={running}
            className="resonance-field-input"
          />
        </div>

        <div className="resonance-field-group">
          <label htmlFor="step" className="resonance-field-label">
            Frequency Step (Hz)
            <button
              type="button"
              className="resonance-reset-field-button"
              onClick={() => setStep(10)}
              title="Reset to default (10)"
              disabled={running}
            >
              ↺
            </button>
          </label>
          <input
            id="step"
            type="number"
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            disabled={running}
            className="resonance-field-input"
          />
        </div>

        <fieldset className="resonance-field-group">
          <legend>Measurement Mode</legend>

          <label className="resonance-radio-label">
            <input
              type="radio"
              name="resonance-mode"
              value="firmware"
              checked={mode === "firmware"}
              onChange={handleModeChangeToFirmware}
              disabled={running}
              className="resonance-radio-input"
            />
            Firmware (device internal sweep)
          </label>

          <label
            className="resonance-radio-label" /* style={{ marginLeft: 12 }} */
          >
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
              className="resonance-radio-input"
            />
            Software (backend-driven sweep)
          </label>
        </fieldset>

        {mode === "software" && (
          <>
            <div className="resonance-field-group">
              <label htmlFor="stabilize-s" className="resonance-field-label">
                Stabilization delay per step (s)
                <button
                  type="button"
                  className="resonance-reset-field-button"
                  onClick={() => setStabilizeS(0.15)}
                  title="Reset to default (0.15)"
                  disabled={running}
                >
                  ↺
                </button>
              </label>
              <input
                id="stabilize-s"
                type="number"
                step="0.01"
                min="0"
                value={stabilizeS}
                onChange={(e) => setStabilizeS(Number(e.target.value))}
                disabled={running}
                className="resonance-field-input"
              />
              <small className="resonance-field-hint">
                Time to wait after setting frequency before reading (default
                0.15s)
              </small>
            </div>

            {/* Plot Options Section */}
            <div className="resonance-plot-options-section">
              <h4>Plot Options</h4>

              <label className="resonance-checkbox-label">
                <input
                  type="checkbox"
                  checked={livePlot}
                  onChange={(e) => setLivePlot(e.target.checked)}
                  disabled={running}
                  className="resonance-checkbox-input"
                />
                <span>Show live plot during measurement</span>
              </label>

              <small className="resonance-field-hint">
                When enabled, a live plot window will open showing phase and
                current vs frequency
              </small>
            </div>

            {/* Save Results Config Section */}
            <div className="resonance-save-results-config-section">
              <h4>Save Results Config</h4>

              <div className="resonance-save-folder-section">
                <button
                  type="button"
                  onClick={selectSaveFolder}
                  disabled={running || isSelectingFolder}
                  className="resonance-folder-select-button"
                >
                  {isSelectingFolder
                    ? "Selecting..."
                    : saveFolderPath
                    ? "Change Save Folder"
                    : "Select Save Folder"}
                </button>

                {/* Always show folder path when we have one, regardless of checkbox state */}
                {saveFolderPath ? (
                  <div className="resonance-folder-path-display">
                    <small>Folder: {saveFolderPath}</small>
                  </div>
                ) : (
                  <div className="resonance-folder-path-warning">
                    <small>
                      ⚠️ Please select a folder to save results/plots
                    </small>
                  </div>
                )}
              </div>

              <label
                className="resonance-checkbox-label"
                style={{ marginTop: "15px" }}
              >
                <input
                  type="checkbox"
                  checked={saveResults}
                  onChange={(e) => {
                    const newSaveResults = e.target.checked;
                    setSaveResults(newSaveResults);

                    // If unchecking and we have a folder, keep it but don't save
                    if (!newSaveResults) {
                      // Keep folder path for next time
                      setMessage(
                        "⚠️ Save disabled but folder will be remembered."
                      );
                    } else if (newSaveResults && !saveFolderPath) {
                      // If checking without a folder, show warning but don't auto-open
                      setMessage(
                        "⚠️ Please select a save folder by clicking the button above."
                      );
                    }
                  }}
                  disabled={running}
                  className="resonance-checkbox-input"
                />
                <span>Save sweep results to CSV file</span>
              </label>

              <label
                className="resonance-checkbox-label"
                style={{ marginTop: "10px" }}
              >
                <input
                  type="checkbox"
                  checked={savePlot}
                  onChange={(e) => {
                    const newSavePlot = e.target.checked;
                    setSavePlot(newSavePlot);

                    // If enabling save plot but no folder is selected
                    if (newSavePlot && !saveFolderPath) {
                      setMessage(
                        "⚠️ Please select a save folder to save the plot."
                      );
                    }
                  }}
                  disabled={running || !livePlot}
                  className="resonance-checkbox-input"
                />
                <span>Save plot as PNG image</span>
              </label>

              <small className="resonance-field-hint">
                Requires "Show live plot" to be enabled and a save folder
                selected
              </small>

              {/* Show folder info even when checkboxes are unchecked but we have a folder */}
              {!saveResults && !savePlot && saveFolderPath && (
                <div
                  className="resonance-folder-path-info"
                  style={{ marginTop: "10px" }}
                >
                  <small>📁 Folder saved for next time: {saveFolderPath}</small>
                </div>
              )}
            </div>
          </>
        )}

        {/* Obtained Frequencies Section */}
        <div className="resonance-obtained-frequencies-section">
          <h3>Obtained Resonance Frequencies</h3>
          <p className="resonance-mode-indicator">
            <small>
              Mode: {mode === "firmware" ? "Firmware-based" : "Software-based"}
            </small>
          </p>

          <div className="resonance-frequency-cards-grid">
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

        <div className="resonance-status-section">
          <p>
            <strong>Status:</strong> {statusText}
          </p>
          {running && (
            <div className="resonance-loading-indicator">
              <div
                className="resonance-spinner"
                data-testid="loading-spinner"
              />
              <p>This process may take several minutes. Please wait...</p>
            </div>
          )}
          {plotOpen && (
            <p className="resonance-plot-open-message">
              📊 Plot window is open. Close it to start a new measurement.
            </p>
          )}
        </div>

        {message && <p className="resonance-message">{message}</p>}

        {/* Add firmware update status display here */}
        {firmwareUpdateStatus && (
          <p
            className={`resonance-firmware-update-status ${
              firmwareUpdateStatus.includes("✓")
                ? "resonance-status-success"
                : "resonance-status-info"
            }`}
          >
            {firmwareUpdateStatus}
          </p>
        )}

        <div className="buttons">
          <button
            onClick={handleStartMeasurement}
            disabled={
              !connected ||
              running ||
              plotOpen ||
              (mode === "software" &&
                ((saveResults && !saveFolderPath) ||
                  (savePlot && !saveFolderPath)) &&
                !isSelectingFolder)
            }
          >
            Start Measurement
          </button>
          <button onClick={onClose} disabled={running || plotOpen}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResonanceModal;
