// ui/components/CommunicationPanel/CommunicationPanel.tsx
import React, { useState } from "react";
import { useBackendRequest } from "../../utils/backendRequests";
import "./CommunicationPanel.model.scss";

interface PortInfo {
  device: string;
  description: string;
}

const CommunicationPanel: React.FC = () => {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [baudrate, setBaudrate] = useState(9600);
  const [parity, setParity] = useState("N");
  const [stopbits, setStopbits] = useState(1);
  const [bytesize, setBytesize] = useState(8);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const { makeRequest } = useBackendRequest();

  async function handleFetchPorts() {
    try {
      setLoading(true);
      const response = await makeRequest("/ports", {
        method: "GET",
      });
      console.log("Fetched ports:", response.data.ports);
      setPorts(response.data.ports);
      /*if (response.data.ports === "success") {
        setPorts(response.data.ports);
      } else {
        console.error("Error fetching COM ports:", response.data.message);
      }*/
    } catch (err) {
      console.error("Failed to fetch ports:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setLoading(true);
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
      }
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    try {
      setLoading(true);
      const response = await makeRequest("/disconnect", {
        method: "POST",
      });
      if (response.data.success) {
        setConnected(false);
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    } finally {
      setLoading(false);
    }
  }

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
          disabled={ports.length === 0}
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
            onChange={(e) => setBaudrate(Number(e.target.value))}
          />
        </label>
        <label>
          Parity:
          <select value={parity} onChange={(e) => setParity(e.target.value)}>
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
            onChange={(e) => setBytesize(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="form-row">
        {!connected ? (
          <button onClick={handleConnect} disabled={!selectedPort || loading}>
            Connect
          </button>
        ) : (
          <button onClick={handleDisconnect} disabled={loading}>
            Disconnect
          </button>
        )}
      </div>

      {connected && (
        <p className="status connected">✅ Connected to {selectedPort}</p>
      )}
      {!connected && <p className="status disconnected">🔌 Not connected</p>}
    </div>
  );
};

export default CommunicationPanel;
