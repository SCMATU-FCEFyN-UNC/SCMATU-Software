import React, { useState, useEffect } from "react";
import "./DeviceDataPanel.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import SerialNumberModal from "../SerialNumberModal/SerialNumberModal";

const DeviceDataPanel: React.FC = () => {
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [samplesAmount, setSamplesAmount] = useState<number>(0);
  const [adcSamplesAmount, setAdcSamplesAmount] = useState<number>(0);
  const [shuntRes, setShuntRes] = useState<number>(0);
  const [voltageGain, setVoltageGain] = useState<number>(0);
  const [currentGain, setCurrentGain] = useState<number>(0);
  const [phaseCurrMaxDistance, setPhaseCurrMaxDistance] = useState<number>(0);
  const [autoFreqSweepWidth, setAutoFreqSweepWidth] = useState<number>(0);
  const [closedLoopControlPeriod, setClosedLoopControlPeriod] =
    useState<number>(0);
  const [snWriteStatus, setSnWriteStatus] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSnModal, setShowSnModal] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const { makeRequest } = useBackendRequest();
  const { connected } = useConnection();

  useEffect(() => {
    if (connected) {
      fetchInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // fetch all getters (reuse individual endpoints)
      await Promise.all([
        handleGetSerialNumber(false),
        handleGetSamplesAmount(false),
        handleGetAdcSamplesAmount(false),
        handleGetShuntRes(false),
        handleGetVoltageGain(false),
        handleGetCurrentGain(false),
        handleGetPhaseCurrMaxDistance(false),
        handleGetAutoFreqSweepWidth(false),
        handleGetClosedLoopControlPeriod(false),
        handleGetSerialNumberWriteStatus(false),
      ]);
      setMessage("✅ Device data loaded");
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      setMessage("❌ Failed to fetch initial data");
    } finally {
      setLoading(false);
    }
  };

  // --- GET handlers (each accepts optional showMessage flag) ---
  const handleGetSerialNumber = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/serial_number", { method: "GET" });
      if (resp.data?.success) {
        setSerialNumber(resp.data.serial_number ?? "");
        if (showMessage) setMessage("✅ Serial number fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get serial number:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetSamplesAmount = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/samples", { method: "GET" });
      if (resp.data?.success) {
        setSamplesAmount(Number(resp.data.samples ?? 0));
        if (showMessage) setMessage("✅ Samples amount fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get samples amount:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetAdcSamplesAmount = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/adc_samples", { method: "GET" });
      if (resp.data?.success) {
        setAdcSamplesAmount(Number(resp.data.adc_samples ?? 0));
        if (showMessage) setMessage("✅ ADC samples amount fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get ADC samples:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetShuntRes = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/shunt_res", { method: "GET" });
      if (resp.data?.success) {
        setShuntRes(Number(resp.data.shunt_res ?? 0));
        if (showMessage) setMessage("✅ Shunt resistor value fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get shunt resistor:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetVoltageGain = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/voltage_gain", { method: "GET" });
      if (resp.data?.success) {
        setVoltageGain(Number(resp.data.voltage_gain ?? 0));
        if (showMessage) setMessage("✅ Voltage gain fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get voltage gain:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentGain = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/current_gain", { method: "GET" });
      if (resp.data?.success) {
        setCurrentGain(Number(resp.data.current_gain ?? 0));
        if (showMessage) setMessage("✅ Current gain fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get current gain:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetPhaseCurrMaxDistance = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/phase_curr_max_distance", {
        method: "GET",
      });
      if (resp.data?.success) {
        setPhaseCurrMaxDistance(Number(resp.data.max_distance ?? 0));
        if (showMessage) setMessage("✅ Phase-current max distance fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get phase-current max distance:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetAutoFreqSweepWidth = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/auto_freq_sweep_width", {
        method: "GET",
      });
      if (resp.data?.success) {
        setAutoFreqSweepWidth(Number(resp.data.sweep_width ?? 0));
        if (showMessage) setMessage("✅ Sweep width fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get sweep width:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetClosedLoopControlPeriod = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/closed_loop_control_period", {
        method: "GET",
      });
      if (resp.data?.success) {
        setClosedLoopControlPeriod(Number(resp.data.control_period ?? 0));
        if (showMessage) setMessage("✅ Closed loop period fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get closed loop period:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGetSerialNumberWriteStatus = async (showMessage = true) => {
    try {
      setLoading(true);
      const resp = await makeRequest("/serial_number_status", {
        method: "GET",
      });
      if (resp.data?.success) {
        setSnWriteStatus(Number(resp.data.status ?? 0));
        if (showMessage) setMessage("✅ Serial number write status fetched");
      } else {
        if (showMessage) setMessage(`❌ ${resp.data.error || "Failed"}`);
      }
    } catch (err) {
      console.error("Failed to get SN write status:", err);
      if (showMessage) setMessage("❌ Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetSamplesAmount = async () => {
    await handleRequest(
      "/samples",
      { samples: samplesAmount },
      "Samples amount updated"
    );
  };

  const handleSetAdcSamplesAmount = async () => {
    await handleRequest(
      "/adc_samples",
      { adc_samples: adcSamplesAmount },
      "ADC samples amount updated"
    );
  };

  const handleSetShuntRes = async () => {
    await handleRequest(
      "/shunt_res",
      { shunt_res: shuntRes },
      "Shunt resistor value updated"
    );
  };

  const handleSetVoltageGain = async () => {
    await handleRequest(
      "/voltage_gain",
      { gain: voltageGain },
      "Voltage adecuator gain updated"
    );
  };

  const handleSetCurrentGain = async () => {
    await handleRequest(
      "/current_gain",
      { gain: currentGain },
      "Current adecuator gain updated"
    );
  };

  const handleSetPhaseCurrMaxDistance = async () => {
    await handleRequest(
      "/phase_curr_max_distance",
      { distance: phaseCurrMaxDistance },
      "Phase current max distance updated"
    );
  };

  const handleSetAutoFreqSweepWidth = async () => {
    await handleRequest(
      "/auto_freq_sweep_width",
      { width: autoFreqSweepWidth },
      "Auto frequency sweep width updated"
    );
  };

  const handleSetClosedLoopControlPeriod = async () => {
    await handleRequest(
      "/closed_loop_control_period",
      { period: closedLoopControlPeriod },
      "Closed loop control period updated"
    );
  };

  const handleRequest = async (
    endpoint: string,
    data: object,
    successMsg: string
  ) => {
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
  };

  const isDisabled = !connected || loading; // Disable inputs if not connected or loading

  return (
    <div className="device-data-panel" style={{ position: "relative" }}>
      <div className="device-data-header">
        <div className="device-data-title">
          <h2>Device Data Panel</h2>
        </div>
        <div className="device-data-sn">
          <label>Serial Number</label>
          <input type="text" value={serialNumber} readOnly disabled={true} />
        </div>
        <div className="device-data-message">{message && <p>{message}</p>}</div>
        <div
          className="device-data-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className={`arrow ${isCollapsed ? "down" : "up"}`}></span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="device-data-content">
          <div className="device-data-container">
            <div className="device-data-sn-fields">
              <div className="device-data-sn-status">
                <label>Serial Number Write Status:</label>
                <p>
                  {snWriteStatus === 0
                    ? "Idle"
                    : snWriteStatus === 1
                    ? "Write Success"
                    : snWriteStatus === 2
                    ? "Incorrect Password"
                    : snWriteStatus === 3
                    ? "Write Not Authorized"
                    : snWriteStatus === 4
                    ? "Write Not Available"
                    : "Unknown Status"}
                </p>
              </div>
              <button
                onClick={() => handleGetSerialNumberWriteStatus()}
                disabled={isDisabled}
              >
                Refresh Status
              </button>
              <button
                onClick={() => handleGetSerialNumber()}
                disabled={isDisabled}
              >
                Read Serial Number
              </button>
              <button
                onClick={() => setShowSnModal(true)}
                disabled={isDisabled}
              >
                Update Serial Number
              </button>
            </div>

            <div className="device-data-fields">
              <div className="device-data-fieldgroup">
                <label>Samples Amount</label>
                <input
                  type="number"
                  value={samplesAmount}
                  onChange={(e) => setSamplesAmount(Number(e.target.value))}
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button
                    onClick={handleSetSamplesAmount}
                    disabled={isDisabled}
                  >
                    Set
                  </button>
                  <button
                    onClick={() => handleGetSamplesAmount()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>
              <div className="device-data-fieldgroup">
                <label>ADC Samples Amount</label>
                <input
                  type="number"
                  value={adcSamplesAmount}
                  onChange={(e) => setAdcSamplesAmount(Number(e.target.value))}
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button
                    onClick={handleSetAdcSamplesAmount}
                    disabled={isDisabled}
                  >
                    Set
                  </button>
                  <button
                    onClick={() => handleGetAdcSamplesAmount()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>

              <div className="device-data-fieldgroup">
                <label>Shunt Resistor Value</label>
                <input
                  type="number"
                  value={shuntRes}
                  onChange={(e) => setShuntRes(Number(e.target.value))}
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button onClick={handleSetShuntRes} disabled={isDisabled}>
                    Set
                  </button>
                  <button
                    onClick={() => handleGetShuntRes()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>

              <div className="device-data-fieldgroup">
                <label>Voltage Adecuator Gain</label>
                <input
                  type="number"
                  value={voltageGain}
                  onChange={(e) => setVoltageGain(Number(e.target.value))}
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button onClick={handleSetVoltageGain} disabled={isDisabled}>
                    Set
                  </button>
                  <button
                    onClick={() => handleGetVoltageGain()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>

              <div className="device-data-fieldgroup">
                <label>Current Adecuator Gain</label>
                <input
                  type="number"
                  value={currentGain}
                  onChange={(e) => setCurrentGain(Number(e.target.value))}
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button onClick={handleSetCurrentGain} disabled={isDisabled}>
                    Set
                  </button>
                  <button
                    onClick={() => handleGetCurrentGain()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>

              <div className="device-data-fieldgroup">
                <label>Phase Current Max Distance</label>
                <input
                  type="number"
                  value={phaseCurrMaxDistance}
                  onChange={(e) =>
                    setPhaseCurrMaxDistance(Number(e.target.value))
                  }
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button
                    onClick={handleSetPhaseCurrMaxDistance}
                    disabled={isDisabled}
                  >
                    Set
                  </button>
                  <button
                    onClick={() => handleGetPhaseCurrMaxDistance()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>

              <div className="device-data-fieldgroup">
                <label>Auto Frequency Sweep Width</label>
                <input
                  type="number"
                  value={autoFreqSweepWidth}
                  onChange={(e) =>
                    setAutoFreqSweepWidth(Number(e.target.value))
                  }
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button
                    onClick={handleSetAutoFreqSweepWidth}
                    disabled={isDisabled}
                  >
                    Set
                  </button>
                  <button
                    onClick={() => handleGetAutoFreqSweepWidth()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>

              <div className="device-data-fieldgroup">
                <label>Closed Loop Control Period (seconds)</label>
                <input
                  type="number"
                  value={closedLoopControlPeriod}
                  onChange={(e) =>
                    setClosedLoopControlPeriod(Number(e.target.value))
                  }
                  disabled={isDisabled}
                />
                <div className="device-data-buttons">
                  <button
                    onClick={handleSetClosedLoopControlPeriod}
                    disabled={isDisabled}
                  >
                    Set
                  </button>
                  <button
                    onClick={() => handleGetClosedLoopControlPeriod()}
                    disabled={isDisabled}
                  >
                    Get
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSnModal && (
        <SerialNumberModal
          initialSerial={serialNumber}
          onClose={() => setShowSnModal(false)}
          onSuccess={() => {
            // refresh SN and status on success
            handleGetSerialNumber();
            handleGetSerialNumberWriteStatus();
          }}
        />
      )}
    </div>
  );
};

export default DeviceDataPanel;
