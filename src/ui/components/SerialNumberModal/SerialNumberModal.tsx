import React, { useState } from "react";
import "./SerialNumberModal.model.scss";
import { useBackendRequest } from "../../utils/backendRequests";

const SerialNumberModal: React.FC<{
  initialSerial?: string;
  onClose: () => void;
  onSuccess?: () => void;
}> = ({ initialSerial = "", onClose, onSuccess }) => {
  const [password, setPassword] = useState<string>("");
  const [serialIn, setSerialIn] = useState<string>(initialSerial);
  const [message, setMessage] = useState<string | null>(null);
  const { makeRequest } = useBackendRequest();

  const statusText = (code: number) => {
    switch (code) {
      case 0:
        return "Idle";
      case 1:
        return "Write Success";
      case 2:
        return "Incorrect Password";
      case 3:
        return "Write Not Authorized";
      case 4:
        return "Write Not Available";
      default:
        return `Unknown (${code})`;
    }
  };

  const handleWrite = async () => {
    setMessage(null);
    try {
      if (!password) {
        setMessage("❌ Password required");
        return;
      }

      // Validate serial number: must be only digits
      if (!/^\d+$/.test(serialIn)) {
        setMessage("❌ Serial number must contain only numbers");
        setSerialIn("");
        return;
      }

      // Validate serial number length: between 1 and 20 characters
      if (serialIn.length < 1 || serialIn.length > 20) {
        setMessage("❌ Serial number must be between 1 and 20 characters");
        setSerialIn("");
        return;
      }

      // 1) write password to HR23
      const pwResp = await makeRequest("/serial_number_password", {
        method: "POST",
        data: { password: Number(password) },
      });
      if (!pwResp.data?.success) {
        setMessage(
          `❌ Failed to write password: ${pwResp.data?.error || "Unknown"}`
        );
        return;
      }

      // 2) read HR24 status
      const statusBefore = await makeRequest("/serial_number_status", {
        method: "GET",
      });
      const codeBefore = Number(statusBefore.data?.status ?? -1);
      if (codeBefore === 2) {
        setMessage("❌ Incorrect password");
        return;
      }
      if (codeBefore === 4) {
        setMessage("❌ Serial number write not available");
        return;
      }

      // 3) attempt write to HR22
      const writeResp = await makeRequest("/serial_number", {
        method: "POST",
        data: { serial_number: serialIn },
      });
      if (!writeResp.data?.success) {
        // still check HR24 for detailed reason
        const statusAfterAttempt = await makeRequest("/serial_number_status", {
          method: "GET",
        });
        const codeAfter = Number(statusAfterAttempt.data?.status ?? -1);
        setMessage(`❌ Write attempt failed: ${statusText(codeAfter)}`);
        return;
      }

      // 4) read HR24 again
      const statusAfter = await makeRequest("/serial_number_status", {
        method: "GET",
      });
      const codeAfter = Number(statusAfter.data?.status ?? -1);
      if (codeAfter === 1) {
        setMessage("✅ Serial number written successfully");
        onSuccess && onSuccess();
        setTimeout(() => onClose(), 700);
      } else {
        setMessage(`❌ Write failed: ${statusText(codeAfter)}`);
      }
    } catch (err) {
      console.error("Serial write error:", err);
      setMessage("❌ Request failed");
    }
  };

  return (
    <div className="sn-modal-overlay">
      <div className="sn-modal-panel">
        <h2>Update Serial Number</h2>

        <div className="sn-fieldGroup">
          <label htmlFor="sn-password">Password</label>
          <input
            id="sn-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="sn-fieldGroup">
          <label htmlFor="sn-new">
            New Serial Number (numbers only, 1-20 digits)
          </label>
          <input
            id="sn-new"
            type="text"
            value={serialIn}
            onChange={(e) => setSerialIn(e.target.value)}
            placeholder="Enter 1-20 numbers"
          />
        </div>

        {message && <p className="sn-message">{message}</p>}

        <div className="sn-buttons">
          <button onClick={handleWrite}>Write Serial Number</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SerialNumberModal;
