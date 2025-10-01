import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Download,
  BarChart3,
  Clock,
  Target,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SentimentIndicator } from '@/components/analytics/SentimentIndicator';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AdvancedAnalytics() {
  usePageTitle('Advanced Analytics');
  const { region, industry, clientname } = useParams();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase.rpc('get_client_by_url_params', {
        p_region: region,
        p_industry: industry,
        p_clientname: clientname
      });

      if (data && data.length > 0) {
        setClientId(data[0].client_id);
      }
    };

    fetchClient();
  }, [region, industry, clientname]);

  useEffect(() => {
    if (!clientId) return;

    const fetchInsights = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('business-intelligence', {
          body: {
            clientId,
            metricType: 'all_metrics',
            dateRange
          }
        });

        if (error) throw error;
        setInsights(data.insights);
      } catch (error) {
        console.error('Error fetching business intelligence:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [clientId, dateRange]);

  if (loading || !insights) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Business Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Deep insights and predictive analytics for your voice AI platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateRange === '7days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('7days')}
          >
            7 Days
          </Button>
          <Button
            variant={dateRange === '30days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('30days')}
          >
            30 Days
          </Button>
          <Button
            variant={dateRange === '90days' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('90days')}
          >
            90 Days
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {insights.sentimentTrends.avgSentiment.toFixed(2)}
              </div>
              <SentimentIndicator score={insights.sentimentTrends.avgSentiment} size="lg" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.conversionFunnel.conversionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {insights.conversionFunnel.outcomes.appointment_booked} appointments booked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Forecast (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${insights.revenueForecast.forecast30Days}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${insights.revenueForecast.dailyAvgRevenue}/day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Repeat Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.customerBehavior.repeatRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {insights.customerBehavior.repeatCallers} repeat callers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="sentiment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="intent">Intent Distribution</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="timing">Peak Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Trends Over Time</CardTitle>
              <CardDescription>Track customer satisfaction across your calls</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={insights.sentimentTrends.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[-1, 1]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgSentiment" 
                    stroke="hsl(var(--primary))" 
                    name="Avg Sentiment"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Positive</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {insights.sentimentTrends.positive}
                </div>
                <p className="text-xs text-muted-foreground">calls</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Neutral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {insights.sentimentTrends.neutral}
                </div>
                <p className="text-xs text-muted-foreground">calls</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Negative</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {insights.sentimentTrends.negative}
                </div>
                <p className="text-xs text-muted-foreground">calls</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Intent Distribution</CardTitle>
              <CardDescription>Understand why customers are calling</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={insights.intentAnalysis.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ intent, percentage }) => `${intent}: ${percentage}%`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="count"
                  >
                    {insights.intentAnalysis.distribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Funnel</CardTitle>
              <CardDescription>Track customer journey through conversation stages</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { stage: 'Greeting', calls: insights.conversionFunnel.stages.greeting },
                  { stage: 'Qualification', calls: insights.conversionFunnel.stages.qualification },
                  { stage: 'Booking', calls: insights.conversionFunnel.stages.booking },
                  { stage: 'Closing', calls: insights.conversionFunnel.stages.closing }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Volume by Hour</CardTitle>
              <CardDescription>Identify peak calling hours to optimize staffing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Peak: {insights.peakHours.peakHour} ({insights.peakHours.peakHourCalls} calls)
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={insights.peakHours.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="calls" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
