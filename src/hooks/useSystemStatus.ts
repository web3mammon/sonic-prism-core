import { useState, useEffect } from 'react';

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
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    // System page is not actively used - returning mock data
    setLoading(false);
    setSystemStatus({
      success: true,
      system: {
        overview: {
          status: 'healthy',
          uptime_percentage: 99.9,
          last_restart: new Date().toISOString(),
          version: '2.0.0',
          environment: 'production'
        },
        metrics: {
          cpu: { usage_percent: 45, cores: 4, temperature: 55 },
          memory: { used_gb: 8, total_gb: 16, usage_percent: 50 },
          storage: { used_gb: 120, total_gb: 500, usage_percent: 24 },
          network: { sent_mb_total: 1500, recv_mb_total: 3000, latency_ms: 25 }
        },
        services: [],
        integrations: [],
        controls: {
          maintenance_mode: false,
          auto_scaling: true,
          backup_enabled: true,
          monitoring_enabled: true
        }
      }
    });
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  return {
    systemStatus,
    loading,
    error,
    refresh: fetchSystemStatus
  };
}