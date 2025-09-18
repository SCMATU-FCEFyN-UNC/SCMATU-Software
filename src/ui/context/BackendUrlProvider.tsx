// src/ui/context/BackendUrlContext.tsx

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface BackendUrlContextType {
  backendUrl: string | null;
  loading: boolean;
  error: string | null;
}

const BackendUrlContext = createContext<BackendUrlContextType | undefined>(
  undefined
);

export const BackendUrlProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [backendUrl, setBackendUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBackendPort() {
      try {
        if (window.electronAPI) {
          const port = await window.electronAPI.getBackendPort();
          setBackendUrl(`http://localhost:${port}`);
        } else {
          console.warn("Electron API not available, fallback or error.");
          setBackendUrl(`http://localhost:5000`); // Fallback to default port
        }
      } catch (err) {
        console.error("Failed to get backend port:", err);
        setError("Failed to connect to backend");
      } finally {
        setLoading(false);
      }
    }

    fetchBackendPort();
  }, []);

  return (
    <BackendUrlContext.Provider value={{ backendUrl, loading, error }}>
      {children}
    </BackendUrlContext.Provider>
  );
};

export const useBackendUrl = (): BackendUrlContextType => {
  const context = useContext(BackendUrlContext);
  if (!context) {
    throw new Error("useBackendUrl must be used within a BackendUrlProvider");
  }
  return context;
};
