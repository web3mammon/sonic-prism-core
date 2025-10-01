import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalCalls: number;
  callsToday: number;
  callsThisMonth: number;
  totalCost: number;
  avgDurationSeconds: number;
  currentBalance: number;
  avgCostPerCall: number;
  callsRemaining: number;
}

interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => void;
}

export function useClientDashboardStats(clientId: string | null): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!clientId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the database function to get dashboard stats
      const { data, error: rpcError } = await supabase.rpc('get_client_dashboard_stats', {
        p_client_id: clientId
      });

      if (rpcError) {
        console.error('Error fetching dashboard stats:', rpcError);
        setError(rpcError.message);
        return;
      }

      if (data) {
        // Cast to any to access JSON properties, then convert to numbers safely
        const statsData = data as any;
        const avgCostPerCall = 2.00; // Always $2 per call (USP)
        const currentBalance = Number(statsData.current_balance) || 0;
        const callsRemaining = avgCostPerCall > 0 ? Math.floor(currentBalance / avgCostPerCall) : 0;

        setStats({
          totalCalls: Number(statsData.total_calls) || 0,
          callsToday: Number(statsData.calls_today) || 0,
          callsThisMonth: Number(statsData.calls_this_month) || 0,
          totalCost: Number(statsData.total_cost) || 0,
          avgDurationSeconds: Number(statsData.avg_duration_seconds) || 0,
          currentBalance: currentBalance,
          avgCostPerCall: avgCostPerCall,
          callsRemaining: callsRemaining
        });
      }
    } catch (err) {
      console.error('Error in useClientDashboardStats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [clientId]);

  const refreshStats = () => {
    fetchStats();
  };

  return { stats, loading, error, refreshStats };
}