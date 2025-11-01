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

      // Get client data (minute-based trial tracking)
      const { data: clientData, error: clientError } = await supabase
        .from('voice_ai_clients')
        .select('trial_minutes, trial_minutes_used, paid_plan, paid_minutes_included, paid_minutes_used, channel_type')
        .eq('client_id', clientId)
        .single();

      if (clientError) throw clientError;

      // Get all call sessions for this client
      const { data: allCalls, error: callsError } = await supabase
        .from('call_sessions')
        .select('created_at, duration_seconds, status')
        .eq('client_id', clientId);

      if (callsError) throw callsError;

      // Calculate date ranges
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate stats
      const totalCalls = allCalls?.length || 0;
      const callsToday = allCalls?.filter(c => new Date(c.created_at) >= startOfToday).length || 0;
      const callsThisMonth = allCalls?.filter(c => new Date(c.created_at) >= startOfMonth).length || 0;

      // Calculate average duration (only completed calls)
      const completedCalls = allCalls?.filter(c => c.duration_seconds && c.duration_seconds > 0) || [];
      const avgDurationSeconds = completedCalls.length > 0
        ? completedCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / completedCalls.length
        : 0;

      // Pricing based on channel type (for display/estimation only - actual billing via FlexPrice)
      const channelType = clientData?.channel_type || 'phone';
      const avgCostPerCall = channelType === 'phone' ? 2.00 : 1.50;

      // Calculate remaining minutes (trial or paid)
      let minutesRemaining = 0;
      const isPaidUser = clientData?.paid_plan === true;

      if (isPaidUser) {
        // Paid user: show remaining from included minutes
        const minutesIncluded = clientData?.paid_minutes_included || 0;
        const minutesUsed = clientData?.paid_minutes_used || 0;
        minutesRemaining = Math.max(0, minutesIncluded - minutesUsed);
      } else {
        // Trial user: show remaining trial minutes
        const trialMinutes = clientData?.trial_minutes || 30;
        const trialUsed = clientData?.trial_minutes_used || 0;
        minutesRemaining = Math.max(0, trialMinutes - trialUsed);
      }

      const callsRemaining = minutesRemaining; // Legacy naming for compatibility
      const currentBalance = minutesRemaining; // Legacy naming for compatibility

      // Estimated total cost (calls made * cost per call) - for display only
      const totalCost = totalCalls * avgCostPerCall;

      setStats({
        totalCalls,
        callsToday,
        callsThisMonth,
        totalCost,
        avgDurationSeconds,
        currentBalance,
        avgCostPerCall,
        callsRemaining
      });
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