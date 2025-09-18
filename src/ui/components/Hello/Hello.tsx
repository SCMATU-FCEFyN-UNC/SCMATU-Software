import React, { useEffect, useState } from "react";
import { useBackendRequest } from "../../utils/backendRequests";
import "./Hello.model.scss";

const Hello: React.FC = () => {
  const {
    makeRequest,
    loading: backendLoading,
    error: backendError,
  } = useBackendRequest();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await makeRequest("/hello", { method: "GET" });
        setMessage(response.data.message); // assuming backend returns { message: "..."}
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [makeRequest]);

  if (backendLoading || loading) return <p>Loading...</p>;
  if (backendError || error) return <p>Error: {backendError || error}</p>;

  return (
    <div className="hello-message">
      <h2>Backend message:</h2>
      <p>{message}</p>
    </div>
  );
};

export default Hello;
