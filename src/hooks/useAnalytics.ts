import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalCalls: number;
  pickupRate: number;
  avgCallDuration: number;
  totalCallTime: number;
  callVolumeData: Array<{ date: string; calls: number }>;
  intentDistribution: Array<{ intent: string; count: number; percentage: number }>;
}

export function useAnalytics(clientId: string | null, dateRange: string = '7days') {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!clientId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Fetch call sessions for this client within date range
      const { data: callSessions, error: callsError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (callsError) throw callsError;

      const sessions = callSessions || [];
      const totalCalls = sessions.length;
      const completedCalls = sessions.filter(s => s.status === 'completed');
      const pickupRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0;

      const totalCallTimeSeconds = completedCalls.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const avgDuration = completedCalls.length > 0
        ? totalCallTimeSeconds / completedCalls.length
        : 0;

      // Generate last 7 days call volume
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const callVolumeData = last7Days.map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calls: sessions.filter(s => s.created_at?.startsWith(date)).length
      }));

      // Extract REAL intent distribution from call sessions
      const intentCounts: any = {};
      sessions.forEach(s => {
        if (s.intent) {
          const intent = s.intent.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
      });

      const intentDistribution = Object.entries(intentCounts).map(([intent, count]: [string, any]) => ({
        intent,
        count,
        percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0
      })).sort((a, b) => b.count - a.count);

      setAnalytics({
        totalCalls,
        pickupRate: Math.round(pickupRate * 10) / 10,
        avgCallDuration: Math.round(avgDuration / 60 * 10) / 10,
        totalCallTime: Math.round(totalCallTimeSeconds / 60 * 10) / 10,
        callVolumeData,
        intentDistribution
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to fetch analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [clientId, dateRange]);

  return { analytics, loading, error, refetch: fetchAnalytics };
}