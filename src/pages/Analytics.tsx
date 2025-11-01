import { useState } from "react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { ModernButton } from "@/components/ui/modern-button";
import {
  TrendingUp,
  Phone,
  Clock,
  Target,
  Calendar,
  Loader2,
  Download,
  BarChart3,
  Activity,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useAnalytics } from "@/hooks/useAnalytics";
import { motion } from "framer-motion";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const { client, loading: clientLoading } = useCurrentClient();
  const { analytics, loading: analyticsLoading, error } = useAnalytics(client?.client_id || null, dateRange);

  // Determine channel type and tracking mode
  const channelType = client?.channel_type || 'phone';
  const hasMinuteTracking = analytics?.hasMinuteTracking || false;

  const exportAnalytics = () => {
    if (!analytics || !client) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Business Name', client.business_name],
      ['Date Range', dateRange],
      ['Channel Type', channelType],
      ...(hasMinuteTracking ? [
        ['Total Minutes Used', analytics.totalMinutesUsed.toString()],
        ['Total Sessions', analytics.totalSessions.toString()],
      ] : [
        ['Total Sessions', analytics.totalSessions.toString()],
      ]),
      ...(channelType === 'both' ? [
        ['Phone Sessions', analytics.phoneSessions.toString()],
        ['Chat Sessions', analytics.chatSessions.toString()],
      ] : []),
      ['Success Rate', `${analytics.pickupRate}%`],
      ['Average Session Duration', `${analytics.avgSessionDuration} min`],
      ['Total Session Time', `${analytics.totalSessionTime} min`],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${client.business_name}_analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (clientLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading analytics: {error || 'No data available'}
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            {channelType === 'both'
              ? 'Real-time metrics for calls and chats'
              : channelType === 'website'
              ? 'Real-time chat metrics and performance data'
              : 'Real-time call metrics and performance data'}
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <ModernButton variant="outline" onClick={() => exportAnalytics()}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </ModernButton>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {hasMinuteTracking ? (
          // Minute-based tracking - show minutes first
          <>
            <MetricsCard
              title="Minutes Used"
              value={analytics.totalMinutesUsed.toLocaleString()}
              icon={Clock}
              subtitle={channelType === 'both' ? 'calls + chats' : channelType === 'website' ? 'total chat time' : 'total call time'}
            />
            <MetricsCard
              title={channelType === 'both' ? 'Total Sessions' : channelType === 'website' ? 'Total Chats' : 'Total Calls'}
              value={analytics.totalSessions.toLocaleString()}
              icon={Phone}
              subtitle={channelType === 'both' ? `${analytics.phoneSessions} calls, ${analytics.chatSessions} chats` : 'all interactions'}
            />
            <MetricsCard
              title="Success Rate"
              value={`${analytics.pickupRate}%`}
              icon={Target}
              subtitle="completed successfully"
            />
            <MetricsCard
              title="Avg Duration"
              value={`${analytics.avgSessionDuration} min`}
              icon={TrendingUp}
              subtitle="per session"
            />
          </>
        ) : (
          // Event-based tracking - show sessions
          <>
            <MetricsCard
              title={channelType === 'both' ? 'Total Sessions' : channelType === 'website' ? 'Total Chats' : 'Total Calls'}
              value={analytics.totalSessions.toLocaleString()}
              icon={Phone}
              subtitle={channelType === 'both' ? `${analytics.phoneSessions} calls, ${analytics.chatSessions} chats` : 'all received'}
            />
            <MetricsCard
              title="Success Rate"
              value={`${analytics.pickupRate}%`}
              icon={Target}
              subtitle={channelType === 'website' ? 'chats completed' : 'calls answered'}
            />
            <MetricsCard
              title="Avg Duration"
              value={`${analytics.avgSessionDuration} min`}
              icon={Clock}
              subtitle="average duration"
            />
            <MetricsCard
              title="Total Time"
              value={`${analytics.totalSessionTime} min`}
              icon={TrendingUp}
              subtitle={channelType === 'both' ? 'calls + chats' : 'total time'}
            />
          </>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <hr className="border-black/[0.05] dark:border-white/5" />
      </motion.div>

      {/* Volume Trend - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-extralight">
              {hasMinuteTracking ? 'Daily Minutes Usage' : channelType === 'both' ? 'Session Volume Trend' : channelType === 'website' ? 'Chat Volume Trend' : 'Call Volume Trend'}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            {hasMinuteTracking
              ? 'Minutes consumed each day over the selected period'
              : channelType === 'both'
              ? 'Daily session volume (calls + chats) over the selected period'
              : channelType === 'website'
              ? 'Daily chat volume over the selected period'
              : 'Daily call volume over the selected period'}
          </p>
        </div>
        <div className="space-y-4">
          {/* Vertical Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-2 relative">
            {analytics.volumeData.map((day, index) => {
              const maxValue = hasMinuteTracking
                ? Math.max(...analytics.volumeData.map(d => d.minutes), 1)
                : Math.max(...analytics.volumeData.map(d => d.sessions), 1);
              const currentValue = hasMinuteTracking ? day.minutes : day.sessions;
              const heightPercent = Math.max((currentValue / maxValue) * 100, 8);

              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full gap-2 pb-6">
                  {/* Bar */}
                  <div className="w-full relative group flex items-end" style={{ height: `${heightPercent}%` }}>
                    <div
                      className="w-full bg-primary rounded-t-md hover:bg-primary/80 transition-all cursor-pointer h-full"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border z-10">
                        {hasMinuteTracking
                          ? `${day.minutes} mins (${day.sessions} sessions)`
                          : channelType === 'both'
                          ? `${day.sessions} sessions`
                          : channelType === 'website'
                          ? `${day.sessions} chats`
                          : `${day.sessions} calls`}
                      </div>
                    </div>
                  </div>

                  {/* Date label */}
                  <span className="text-xs text-muted-foreground text-center whitespace-nowrap absolute bottom-0">
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Intent Distribution - only show if we have intent data */}
      {analytics.intentDistribution && analytics.intentDistribution.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">
                {channelType === 'both' ? 'Session Intent Distribution' : channelType === 'website' ? 'Chat Intent Distribution' : 'Call Intent Distribution'}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {channelType === 'both'
                ? 'Breakdown of interaction types and their frequency'
                : channelType === 'website'
                ? 'Breakdown of chat types and their frequency'
                : 'Breakdown of call types and their frequency'}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analytics.intentDistribution.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.intent}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">{item.count}</span>
                    <span className="font-medium text-primary">{item.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-black/[0.05] dark:bg-white/[0.05] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}