import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import {
  TrendingUp,
  Phone,
  Clock,
  Target,
  Calendar,
  Loader2,
  Download
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

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const { client, loading: clientLoading } = useCurrentClient();
  const { analytics, loading: analyticsLoading, error } = useAnalytics(client?.client_id || null, dateRange);

  const exportAnalytics = () => {
    if (!analytics || !client) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Business Name', client.business_name],
      ['Date Range', dateRange],
      ['Total Calls', analytics.totalCalls.toString()],
      ['Pickup Rate', `${analytics.pickupRate}%`],
      ['Average Call Duration', `${analytics.avgCallDuration} min`],
      ['Total Call Time', `${analytics.totalCallTime} min`],
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
    <div className="space-y-6 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time call metrics and performance data
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
          <Button variant="outline" onClick={() => exportAnalytics()}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Total Calls"
          value={analytics.totalCalls.toLocaleString()}
          icon={Phone}
          subtitle="all calls received"
        />
        <MetricsCard
          title="Pickup Rate"
          value={`${analytics.pickupRate}%`}
          icon={Target}
          subtitle="calls answered by AI"
        />
        <MetricsCard
          title="Avg Call Duration"
          value={`${analytics.avgCallDuration} min`}
          icon={Clock}
          subtitle="average duration"
        />
        <MetricsCard
          title="Total Call Time"
          value={`${analytics.totalCallTime} min`}
          icon={TrendingUp}
          subtitle="total time on calls"
        />
      </div>

      <hr className="border-border" />

      {/* Call Volume Trend - Full Width */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-extralight">Call Volume Trend</h2>
          <p className="text-muted-foreground">
            Daily call volume over the selected period
          </p>
        </div>
        <div className="space-y-4">
          {/* Vertical Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-2 relative">
            {analytics.callVolumeData.map((day, index) => {
              const maxCalls = Math.max(...analytics.callVolumeData.map(d => d.calls), 1);
              const heightPercent = Math.max((day.calls / maxCalls) * 100, 8);

              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full gap-2 pb-6">
                  {/* Bar */}
                  <div className="w-full relative group flex items-end" style={{ height: `${heightPercent}%` }}>
                    <div
                      className="w-full bg-primary rounded-t-md hover:bg-primary/80 transition-all cursor-pointer h-full"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border z-10">
                        {day.calls} calls
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
      </div>

      {/* Call Intent Distribution - only show if we have intent data */}
      {analytics.intentDistribution && analytics.intentDistribution.length > 0 && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="font-extralight">Call Intent Distribution</CardTitle>
            <CardDescription>
              Breakdown of call types and their frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analytics.intentDistribution.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.intent}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">{item.count}</span>
                      <span className="font-medium">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}