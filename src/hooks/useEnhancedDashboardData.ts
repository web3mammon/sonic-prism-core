import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedDashboardData {
  // Sentiment
  avgSentiment: number | null;
  sentimentTrend: 'up' | 'down' | 'stable';

  // Success metrics
  successRate: number;
  totalCompletedCalls: number;
  totalFailedCalls: number;

  // Intent analysis
  topIntent: string | null;
  intentDistribution: { intent: string; count: number }[];

  // Time patterns
  peakHour: number | null;
  callsByHour: { hour: number; calls: number }[];

  // Transfer metrics
  transferRate: number;
  transferCount: number;

  // Comparison data
  callsYesterday: number;
  callsChangePercent: number;

  // New metrics for dashboard cards
  callsThisMonth: number;
  avgCallDuration: number | null; // in minutes
  callsRemaining: number | null;
  creditBalance: number | null;
}

export function useEnhancedDashboardData(clientId: string | null, region: string = 'us') {
  const [data, setData] = useState<EnhancedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnhancedData = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all call sessions for this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: calls, error: callsError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false });

      if (callsError) throw callsError;

      if (!calls || calls.length === 0) {
        setData({
          avgSentiment: null,
          sentimentTrend: 'stable',
          successRate: 0,
          totalCompletedCalls: 0,
          totalFailedCalls: 0,
          topIntent: null,
          intentDistribution: [],
          peakHour: null,
          callsByHour: [],
          transferRate: 0,
          transferCount: 0,
          callsYesterday: 0,
          callsChangePercent: 0,
          callsThisMonth: 0,
          avgCallDuration: null,
          callsRemaining: null,
          creditBalance: null,
        });
        return;
      }

      // Calculate sentiment
      const callsWithSentiment = calls.filter(c => c.sentiment_score !== null);
      const avgSentiment = callsWithSentiment.length > 0
        ? callsWithSentiment.reduce((sum, c) => sum + (c.sentiment_score || 0), 0) / callsWithSentiment.length
        : null;

      // Calculate success rate
      const completedCalls = calls.filter(c => c.status === 'completed');
      const failedCalls = calls.filter(c => ['failed', 'busy', 'no-answer'].includes(c.status));
      const successRate = calls.length > 0 ? (completedCalls.length / calls.length) * 100 : 0;

      // Top intent
      const intentCounts = new Map<string, number>();
      calls.forEach(call => {
        if (call.primary_intent) {
          intentCounts.set(call.primary_intent, (intentCounts.get(call.primary_intent) || 0) + 1);
        }
      });
      const intentDistribution = Array.from(intentCounts.entries())
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count);
      const topIntent = intentDistribution[0]?.intent || null;

      // Peak hour analysis
      const hourCounts = new Map<number, number>();
      calls.forEach(call => {
        const hour = new Date(call.start_time).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      const callsByHour = Array.from(hourCounts.entries())
        .map(([hour, calls]) => ({ hour, calls }))
        .sort((a, b) => a.hour - b.hour);
      const peakHour = callsByHour.length > 0
        ? callsByHour.reduce((max, curr) => curr.calls > max.calls ? curr : max).hour
        : null;

      // Transfer metrics
      const transferCalls = calls.filter(c => c.transfer_requested === true);
      const transferRate = calls.length > 0 ? (transferCalls.length / calls.length) * 100 : 0;

      // Yesterday comparison
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const callsYesterday = calls.filter(c => {
        const callDate = new Date(c.created_at);
        return callDate >= yesterday && callDate < today;
      }).length;

      const callsToday = calls.filter(c => {
        const callDate = new Date(c.created_at);
        return callDate >= today;
      }).length;

      const callsChangePercent = callsYesterday > 0
        ? ((callsToday - callsYesterday) / callsYesterday) * 100
        : callsToday > 0 ? 100 : 0;

      // Calculate average call duration (in minutes)
      const callsWithDuration = calls.filter(c => c.duration_seconds !== null && c.duration_seconds > 0);
      const avgCallDuration = callsWithDuration.length > 0
        ? callsWithDuration.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / callsWithDuration.length / 60
        : null;

      // NOTE: Trial credits are fetched from useCurrentClient hook, not here
      // This hook should only focus on analytics from call_sessions

      setData({
        avgSentiment,
        sentimentTrend: callsChangePercent > 5 ? 'up' : callsChangePercent < -5 ? 'down' : 'stable',
        successRate,
        totalCompletedCalls: completedCalls.length,
        totalFailedCalls: failedCalls.length,
        topIntent,
        intentDistribution,
        peakHour,
        callsByHour,
        transferRate,
        transferCount: transferCalls.length,
        callsYesterday,
        callsChangePercent,
        callsThisMonth: calls.length,
        avgCallDuration,
        callsRemaining: null, // Deprecated: Use client.trial_* fields instead
        creditBalance: null, // Deprecated: Use client.trial_* fields instead
      });
    } catch (err) {
      console.error('Error fetching enhanced dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnhancedData();
  }, [clientId, region]);

  return { data, loading, error, refresh: fetchEnhancedData };
}
