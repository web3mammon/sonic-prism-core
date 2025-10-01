import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  MessageSquare,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceAIClients, useCallSessions } from '@/hooks/useVoiceAI';

interface VoiceAIStatsProps {
  clientId?: string;
  timeRange?: 'today' | 'week' | 'month';
}

export const VoiceAIStats: React.FC<VoiceAIStatsProps> = ({ 
  clientId, 
  timeRange = 'today' 
}) => {
  const { clients } = useVoiceAIClients();
  const { sessions } = useCallSessions(clientId);
  const [stats, setStats] = useState({
    totalCalls: 0,
    activeCalls: 0,
    completedCalls: 0,
    failedCalls: 0,
    avgDuration: 0,
    totalRevenue: 0,
    successRate: 0,
    busyRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStats();
  }, [sessions, timeRange]);

  const calculateStats = async () => {
    try {
      setLoading(true);
      
      // Get date range filter
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Filter sessions by date range
      const filteredSessions = sessions.filter(session => 
        new Date(session.start_time) >= startDate
      );

      const totalCalls = filteredSessions.length;
      const activeCalls = filteredSessions.filter(s => 
        s.status === 'ringing' || s.status === 'in-progress'
      ).length;
      
      const completedCalls = filteredSessions.filter(s => 
        s.status === 'completed'
      ).length;
      
      const failedCalls = filteredSessions.filter(s => 
        s.status === 'failed' || s.status === 'no-answer'
      ).length;

      // Calculate average duration (only for completed calls)
      const completedCallsWithDuration = filteredSessions.filter(s => 
        s.status === 'completed' && s.duration_seconds > 0
      );
      
      const avgDuration = completedCallsWithDuration.length > 0
        ? completedCallsWithDuration.reduce((sum, s) => sum + s.duration_seconds, 0) / completedCallsWithDuration.length
        : 0;

      // Calculate total revenue
      const totalRevenue = filteredSessions.reduce((sum, s) => 
        sum + (s.cost_amount || 0), 0
      );

      // Calculate success rate
      const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
      
      // Calculate busy rate
      const busyRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;

      setStats({
        totalCalls,
        activeCalls,
        completedCalls,
        failedCalls,
        avgDuration,
        totalRevenue,
        successRate,
        busyRate
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'today' ? 'Today' : `Last ${timeRange}`}
            </p>
          </CardContent>
        </Card>

        {/* Active Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeCalls}</div>
            <div className="flex items-center space-x-2">
              {stats.activeCalls > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Live
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
              {stats.successRate.toFixed(1)}%
            </div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedCalls} completed calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Call Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <Clock className="h-4 w-4" />
              <span>Average Duration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatDuration(stats.avgDuration)}</div>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Completed calls</span>
                <span className="font-medium">{stats.completedCalls}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed/No answer</span>
                <span className="font-medium text-red-600">{stats.failedCalls}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <TrendingUp className="h-4 w-4" />
              <span>Call Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-medium">{stats.completedCalls}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm">Active</span>
                </div>
                <span className="font-medium">{stats.activeCalls}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Failed</span>
                </div>
                <span className="font-medium">{stats.failedCalls}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Success Rate</span>
                  <span className={getSuccessRateColor(stats.successRate)}>
                    {stats.successRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.successRate} />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Failure Rate</span>
                  <span className="text-red-600">{stats.busyRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.busyRate} className="bg-red-100" />
              </div>
              
              <div className="text-xs text-muted-foreground">
                Based on {stats.totalCalls} total calls
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};