import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalCalls: number;
  successRate: number;
  avgCallDuration: number;
  customerSatisfaction: number;
  peakHours: string;
  conversionRate: number;
  totalRevenue: number;
  avgResponseTime: string;
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
      const successRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0;
      
      const avgDuration = completedCalls.length > 0 
        ? completedCalls.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedCalls.length
        : 0;

      const totalRevenue = sessions.reduce((sum, s) => sum + (s.cost_amount || 0), 0);

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

      // Extract intent distribution from transcript summaries (mock for now)
      const mockIntents = [
        { intent: "Appointment Booking", count: Math.floor(totalCalls * 0.33), percentage: 33 },
        { intent: "Emergency Service", count: Math.floor(totalCalls * 0.24), percentage: 24 },
        { intent: "Quote Request", count: Math.floor(totalCalls * 0.19), percentage: 19 },
        { intent: "General Inquiry", count: Math.floor(totalCalls * 0.15), percentage: 15 },
        { intent: "Complaint", count: Math.floor(totalCalls * 0.09), percentage: 9 },
      ];

      setAnalytics({
        totalCalls,
        successRate: Math.round(successRate * 10) / 10,
        avgCallDuration: Math.round(avgDuration / 60 * 10) / 10,
        customerSatisfaction: 4.6, // TODO: Implement post-call rating system
        peakHours: "10 AM - 2 PM", // TODO: Calculate from call timestamps
        conversionRate: Math.round(successRate * 0.8 * 10) / 10,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgResponseTime: "1.8 sec", // TODO: Track voice stream timing data
        callVolumeData,
        intentDistribution: mockIntents // TODO: Implement NLP intent analysis
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