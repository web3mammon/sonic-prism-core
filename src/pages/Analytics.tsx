import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import {
  BarChart3,
  TrendingUp,
  Phone,
  Clock,
  Users,
  Target,
  Calendar,
  DollarSign,
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
      ['Success Rate', `${analytics.successRate}%`],
      ['Average Call Duration', `${analytics.avgCallDuration} min`],
      ['Customer Satisfaction', `${analytics.customerSatisfaction}/5.0`],
      ['Total Revenue', `$${analytics.totalRevenue}`],
      ['Conversion Rate', `${analytics.conversionRate}%`],
      ['Peak Hours', analytics.peakHours],
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your AI agent's performance
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
          subtitle="total calls"
        />
        <MetricsCard
          title="Success Rate"
          value={`${analytics.successRate}%`}
          icon={Target}
          subtitle="calls completed"
        />
        <MetricsCard
          title="Avg Call Duration"
          value={`${analytics.avgCallDuration} min`}
          icon={Clock}
          subtitle="average duration"
        />
        {/* TODO: Implement customer satisfaction tracking
        <MetricsCard
          title="Customer Satisfaction"
          value={`${analytics.customerSatisfaction}/5.0`}
          changeType="positive"
          icon={Users}
          subtitle="rating score"
        />
        */}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Call Volume Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Call Volume Trend</CardTitle>
            <CardDescription>
              Daily call volume over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.callVolumeData.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{day.date}</span>
                  <div className="flex items-center space-x-2 flex-1 ml-4">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${Math.max(day.calls / Math.max(...analytics.callVolumeData.map(d => d.calls), 1) * 100, 5)}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {day.calls}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {/* TODO: Calculate peak hours from call timestamps
              <div className="flex justify-between text-sm">
                <span>Peak Hours</span>
                <span className="font-medium">{analytics.peakHours}</span>
              </div>
              */}
              <div className="flex justify-between text-sm">
                <span>Conversion Rate</span>
                <span className="font-medium text-green-600">{analytics.conversionRate}%</span>
              </div>
              {/* TODO: Track voice stream timing data
              <div className="flex justify-between text-sm">
                <span>Avg Response Time</span>
                <span className="font-medium">{analytics.avgResponseTime}</span>
              </div>
              */}
              <div className="flex justify-between text-sm">
                <span>Total Revenue</span>
                <span className="font-medium">${analytics.totalRevenue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TODO: Implement NLP Intent Analysis
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Call Intent Distribution</CardTitle>
            <CardDescription>
              Breakdown of call types and their frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.intentDistribution.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.intent}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">{item.count} calls</span>
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
        */}
      </div>

      {/* TODO: Implement AI-powered insights and recommendations
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Insights</CardTitle>
            <CardDescription>
              Automated insights from your call data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Peak Performance Day</p>
                  <p className="text-sm text-muted-foreground">
                    Saturday showed the highest success rate at 96.8%
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Call Volume Increase</p>
                  <p className="text-sm text-muted-foreground">
                    15% increase in emergency service calls this week
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Revenue Impact</p>
                  <p className="text-sm text-muted-foreground">
                    Quote requests generated $1,240 in potential revenue
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              AI-powered suggestions to improve performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Optimize Peak Hours
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Consider increasing capacity during 10 AM - 2 PM to handle higher call volume
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Improve Emergency Response
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Emergency calls have 98% success rate - consider promoting this feature
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Address Complaint Patterns
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Review complaint call transcripts to identify common issues
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}