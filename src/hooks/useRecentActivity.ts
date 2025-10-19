import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  time: string;
  event: string;
  status: 'success' | 'info' | 'warning' | 'error';
  details?: any;
}

interface UseRecentActivityResult {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  refreshActivities: () => void;
}

export function useRecentActivity(clientId: string | null): UseRecentActivityResult {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    if (!clientId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch recent call sessions (last 5)
      const { data: callSessions, error: callsError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (callsError) throw callsError;

      // Transform call sessions into activity items
      const callActivities: ActivityItem[] = (callSessions || []).map(call => {
        const timeAgo = getTimeAgo(new Date(call.created_at));
        const cost = call.cost_amount || 0;
        const duration = call.duration_seconds || 0;

        let event = '';
        let status: 'success' | 'info' | 'warning' | 'error' = 'success';

        switch (call.status) {
          case 'completed':
            event = `Call completed - ${formatDuration(duration)}${cost > 0 ? ` - $${cost.toFixed(2)} charged` : ''}`;
            status = 'success';
            break;
          case 'failed':
          case 'busy':
          case 'no-answer':
            event = `Call ${call.status} - ${call.caller_number || 'Unknown number'}`;
            status = 'error';
            break;
          case 'in-progress':
            event = `Call in progress with ${call.caller_number || 'Unknown number'}`;
            status = 'info';
            break;
          default:
            event = `Call ${call.status}`;
            status = 'info';
        }

        return {
          time: timeAgo,
          event,
          status,
          details: {
            callSid: call.call_sid,
            caller: call.caller_number,
            duration,
            cost
          }
        };
      });

      setActivities(callActivities);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [clientId]);

  const refreshActivities = () => {
    fetchActivities();
  };

  return { activities, loading, error, refreshActivities };
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
