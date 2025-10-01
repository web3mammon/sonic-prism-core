import { useState, useEffect } from 'react';
import { useClientAPI } from './useClientAPI';

interface SystemMetrics {
  cpu: {
    usage_percent: number;
    cores: number;
    temperature: number;
  };
  memory: {
    used_gb: number;
    total_gb: number;
    usage_percent: number;
  };
  storage: {
    used_gb: number;
    total_gb: number;
    usage_percent: number;
  };
  network: {
    sent_mb_total: number;
    recv_mb_total: number;
    latency_ms: number;
  };
}

interface SystemStatus {
  success: boolean;
  system: {
    overview: {
      status: string;
      uptime_percentage: number;
      last_restart: string;
      version: string;
      environment: string;
    };
    metrics: SystemMetrics;
    services: Array<{
      name: string;
      port: number;
      health: number;
      status: string;
      last_check: string;
    }>;
    integrations: Array<{
      name: string;
      status: string;
      last_sync: string;
      health: string;
    }>;
    controls: {
      maintenance_mode: boolean;
      auto_scaling: boolean;
      backup_enabled: boolean;
      monitoring_enabled: boolean;
    };
  };
}

export function useSystemStatus() {
  const { makeAPICall, client, loading: clientLoading } = useClientAPI();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await makeAPICall('/system/status');
      setSystemStatus(data);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch when client is available and not loading
    if (!clientLoading && client) {
      fetchSystemStatus();

      // Refresh every 30 seconds
      const interval = setInterval(fetchSystemStatus, 30000);

      return () => clearInterval(interval);
    } else if (!clientLoading && !client) {
      // Client loading finished but no client found
      setError('No client found');
      setLoading(false);
    }
  }, [clientLoading, client]);

  return {
    systemStatus,
    loading,
    error,
    refresh: fetchSystemStatus
  };
}