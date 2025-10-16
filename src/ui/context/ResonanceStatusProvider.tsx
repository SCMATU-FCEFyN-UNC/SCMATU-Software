import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ResonanceContextType {
  running: boolean;
  setRunning: (val: boolean) => void;
  statusText: string;
  setStatusText: (text: string) => void;
}

const ResonanceContext = createContext<ResonanceContextType | undefined>(
  undefined
);

export const ResonanceStatusProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState("Not started");

  return (
    <ResonanceContext.Provider
      value={{ running, setRunning, statusText, setStatusText }}
    >
      {children}
    </ResonanceContext.Provider>
  );
};

// ✅ Custom hook for easy usage
export const useResonanceStatus = () => {
  const ctx = useContext(ResonanceContext);
  if (!ctx) {
    throw new Error(
      "useResonanceStatus must be used within a ResonanceStatusProvider"
    );
  }
  return ctx;
};
