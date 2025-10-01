import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ConnectionContextType {
  connected: boolean;
  setConnected: (val: boolean) => void;
  selectedPort: string;
  setSelectedPort: (port: string) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(
  undefined
);

export const ConnectionStatusProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [connected, setConnected] = useState(false);
  const [selectedPort, setSelectedPort] = useState("");

  return (
    <ConnectionContext.Provider
      value={{ connected, setConnected, selectedPort, setSelectedPort }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

// 🔑 Custom hook for easier usage
export const useConnection = () => {
  const ctx = useContext(ConnectionContext);
  if (!ctx) {
    throw new Error(
      "useConnection must be used within a ConnectionStatusProvider"
    );
  }
  return ctx;
};
