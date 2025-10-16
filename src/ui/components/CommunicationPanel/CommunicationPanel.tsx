// ui/components/CommunicationPanel/CommunicationPanel.tsx
import React, { useEffect, useRef, useState } from "react";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";
import "./CommunicationPanel.model.scss";

interface PortInfo {
  device: string;
  description: string;
}

const CommunicationPanel: React.FC = () => {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [baudrate, setBaudrate] = useState(9600);
  const [parity, setParity] = useState("N");
  const [stopbits, setStopbits] = useState(1);
  const [bytesize, setBytesize] = useState(8);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { makeRequest } = useBackendRequest();
  const { connected, setConnected, selectedPort, setSelectedPort } =
    useConnection();
  const { running } = useResonanceStatus();

  // Track last fetch request to avoid race condition overwriting
  const lastRequestId = useRef(0);

  async function handleFetchPorts() {
    const requestId = ++lastRequestId.current;
    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await makeRequest("/ports", { method: "GET" });

      if (requestId !== lastRequestId.current) return; // ignore stale result
      const newPorts: PortInfo[] = response?.data?.ports ?? []; // ✅ always an array
      setPorts(newPorts);

      // If currently selected port no longer exists, clear it
      if (!newPorts.find((p) => p.device === selectedPort)) {
        setSelectedPort("");
      }
    } catch (err) {
      console.error("Failed to fetch ports:", err);
      if (requestId === lastRequestId.current)
        setErrorMessage("Failed to fetch available ports. Please try again.");
    } finally {
      if (requestId === lastRequestId.current) setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Re-fetch ports to validate availability
      const portResponse = await makeRequest("/ports", { method: "GET" });
      const availablePorts: PortInfo[] = portResponse?.data?.ports ?? [];
      setPorts(availablePorts);

      if (!availablePorts.some((p) => p.device === selectedPort)) {
        setSelectedPort("");
        setErrorMessage("Selected port is no longer available.");
        return;
      }

      const response = await makeRequest("/connect", {
        method: "POST",
        data: {
          port: selectedPort,
          baudrate,
          parity,
          stopbits,
          bytesize,
        },
      });

      if (response.data.success) {
        setConnected(true);
      } else {
        setErrorMessage("Failed to connect to the selected port.");
      }
    } catch (err) {
      console.error("Failed to connect:", err);
      setErrorMessage(
        "Failed to connect. Please check the device and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await makeRequest("/disconnect", { method: "POST" });
      if (response.data.success) {
        setConnected(false);
      } else {
        setErrorMessage("Failed to disconnect properly.");
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      setErrorMessage("Unexpected error while disconnecting.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-disconnect if selected port disappears while connected
  useEffect(() => {
    if (connected && !ports.find((p) => p.device === selectedPort)) {
      setConnected(false);
      setSelectedPort("");
      setErrorMessage("Connection lost: port is no longer available.");
    }
  }, [ports, connected, selectedPort]);

  return (
    <div className="communication-panel">
      <h2>Communication Setup</h2>

      <div className="form-row">
        <button onClick={handleFetchPorts} disabled={loading}>
          {loading ? "Loading..." : "Check Available Ports"}
        </button>

        <label htmlFor="port-select">Port:</label>
        <select
          id="port-select"
          disabled={(ports?.length ?? 0) === 0 || connected || loading} // ✅ safe check
          value={selectedPort}
          onChange={(e) => setSelectedPort(e.target.value)}
        >
          <option value="">Select a Port</option>
          {ports.map((p) => (
            <option key={p.device} value={p.device}>
              {p.device} - {p.description}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>
          Baudrate:
          <input
            type="number"
            value={baudrate}
            disabled={connected || loading}
            onChange={(e) => setBaudrate(Number(e.target.value))}
          />
        </label>
        <label>
          Parity:
          <select
            value={parity}
            disabled={connected || loading}
            onChange={(e) => setParity(e.target.value)}
          >
            <option value="N">None</option>
            <option value="E">Even</option>
            <option value="O">Odd</option>
          </select>
        </label>
        <label>
          Stop Bits:
          <input
            type="number"
            value={stopbits}
            min={1}
            max={2}
            disabled={connected || loading}
            onChange={(e) => setStopbits(Number(e.target.value))}
          />
        </label>
        <label>
          Byte Size:
          <input
            type="number"
            value={bytesize}
            min={5}
            max={8}
            disabled={connected || loading}
            onChange={(e) => setBytesize(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="form-row">
        {!connected ? (
          <button onClick={handleConnect} disabled={!selectedPort || loading}>
            {loading ? "Connecting..." : "Connect"}
          </button>
        ) : (
          <button onClick={handleDisconnect} disabled={loading || running}>
            {loading ? "Disconnecting..." : "Disconnect"}
          </button>
        )}
      </div>

      {errorMessage && <p className="status error">⚠️ {errorMessage}</p>}
      {connected && (
        <p className="status connected">✅ Connected to {selectedPort}</p>
      )}
      {!connected && !errorMessage && (
        <p className="status disconnected">🔌 Not connected</p>
      )}
    </div>
  );
};

export default CommunicationPanel;
