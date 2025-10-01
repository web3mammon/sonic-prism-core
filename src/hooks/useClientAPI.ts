import { useCurrentClient } from './useCurrentClient';

export function useClientAPI() {
  const { client, loading, error } = useCurrentClient();

  // Get the API base URL for the current client
  const getAPIUrl = () => {
    if (!client) {
      return null;
    }
    // Use nginx proxy path in production, localhost in development
    if (window.location.hostname === 'localhost') {
      return `http://localhost:${client.port}`;
    } else {
      // Use dynamic proxy path from database
      return client.api_proxy_path || `/api/${client.client_id}`;
    }
  };

  // Make API calls to the client's specific API endpoint
  const makeAPICall = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = getAPIUrl();
    if (!baseUrl) {
      throw new Error('Client API URL not available');
    }

    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  return {
    client,
    loading,
    error,
    apiUrl: getAPIUrl(),
    makeAPICall,
  };
}