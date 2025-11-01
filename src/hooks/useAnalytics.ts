import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  // Core metrics (works for both minute-based and event-based)
  totalSessions: number;         // Total interactions (calls + chats)
  totalMinutesUsed: number;      // Total minutes consumed
  pickupRate: number;            // Success rate
  avgSessionDuration: number;    // Average duration in minutes
  totalSessionTime: number;      // Total time in minutes

  // Chart data
  volumeData: Array<{ date: string; sessions: number; minutes: number }>;
  intentDistribution: Array<{ intent: string; count: number; percentage: number }>;

  // Channel breakdown (for "both" type)
  phoneSessions: number;
  chatSessions: number;

  // Tracking mode
  hasMinuteTracking: boolean;
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

      // Fetch BOTH call sessions AND chat sessions
      const { data: callSessions, error: callsError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (callsError) throw callsError;

      const { data: chatSessions, error: chatsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('client_id', clientId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (chatsError) throw chatsError;

      // Check if client has minute tracking (fetch client to determine)
      const { data: clientData } = await supabase
        .from('voice_ai_clients')
        .select('trial_minutes, channel_type')
        .eq('client_id', clientId)
        .single();

      const hasMinuteTracking = clientData?.trial_minutes !== undefined && clientData?.trial_minutes !== null;
      const channelType = clientData?.channel_type || 'phone';

      // Combine sessions
      const calls = callSessions || [];
      const chats = chatSessions || [];
      const totalSessions = calls.length + chats.length;

      // Calculate success rate (completed sessions / total sessions)
      const completedCalls = calls.filter(s => s.status === 'completed');
      const completedChats = chats.filter(s => s.status === 'completed' || s.status === 'ended');
      const totalCompleted = completedCalls.length + completedChats.length;
      const pickupRate = totalSessions > 0 ? (totalCompleted / totalSessions) * 100 : 0;

      // Calculate total time in seconds
      const callTimeSeconds = completedCalls.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const chatTimeSeconds = completedChats.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const totalTimeSeconds = callTimeSeconds + chatTimeSeconds;

      // Calculate minutes used (rounded UP for billing accuracy)
      const totalMinutesUsed = calls.reduce((sum, s) => sum + Math.ceil((s.duration_seconds || 0) / 60), 0) +
                              chats.reduce((sum, s) => sum + Math.ceil((s.duration_seconds || 0) / 60), 0);

      // Average duration
      const avgDuration = totalCompleted > 0
        ? totalTimeSeconds / totalCompleted
        : 0;

      // Generate volume data for last 7 days (sessions + minutes)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const volumeData = last7Days.map(date => {
        const dayCalls = calls.filter(s => s.created_at?.startsWith(date));
        const dayChats = chats.filter(s => s.created_at?.startsWith(date));

        const dayMinutes = dayCalls.reduce((sum, s) => sum + Math.ceil((s.duration_seconds || 0) / 60), 0) +
                           dayChats.reduce((sum, s) => sum + Math.ceil((s.duration_seconds || 0) / 60), 0);

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sessions: dayCalls.length + dayChats.length,
          minutes: dayMinutes
        };
      });

      // Extract intent distribution from BOTH call and chat sessions
      const intentCounts: any = {};

      calls.forEach(s => {
        if (s.primary_intent || s.intent) {
          const intent = (s.primary_intent || s.intent).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
      });

      chats.forEach(s => {
        if (s.intent) {
          const intent = s.intent.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
      });

      const intentDistribution = Object.entries(intentCounts).map(([intent, count]: [string, any]) => ({
        intent,
        count,
        percentage: totalSessions > 0 ? Math.round((count / totalSessions) * 100) : 0
      })).sort((a, b) => b.count - a.count);

      setAnalytics({
        totalSessions,
        totalMinutesUsed,
        pickupRate: Math.round(pickupRate * 10) / 10,
        avgSessionDuration: Math.round(avgDuration / 60 * 10) / 10,
        totalSessionTime: Math.round(totalTimeSeconds / 60 * 10) / 10,
        volumeData,
        intentDistribution,
        phoneSessions: calls.length,
        chatSessions: chats.length,
        hasMinuteTracking
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