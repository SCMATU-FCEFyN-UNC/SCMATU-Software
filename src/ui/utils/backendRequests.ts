import axios from "axios";
import { useBackendUrl } from '../context/BackendUrlProvider';

export const useBackendRequest = () => {
  const { backendUrl, loading, error } = useBackendUrl();

  const makeRequest = async (path: string, options = {}) => {
    if (loading) throw new Error("Backend is still loading");
    if (error || !backendUrl) throw new Error("Backend URL not available");

    const url = `${backendUrl}${path}`;
    return axios({ url, ...options });
  };

  return { makeRequest, loading, error };
};