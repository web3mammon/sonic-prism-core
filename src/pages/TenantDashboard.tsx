import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModernButton } from "@/components/ui/modern-button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { StatusDot } from "@/components/ui/status-dot";
import { LiveDemoSection } from "@/components/LiveDemoSection";
import { BusinessInfoSection } from "@/components/BusinessInfoSection";
import { LiveCallMonitor } from "@/components/voice-ai/LiveCallMonitor";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useClientDashboardStats } from "@/hooks/useClientDashboardStats";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { useEnhancedDashboardData } from "@/hooks/useEnhancedDashboardData";
import { useTenant } from "@/hooks/useTenant";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Phone,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Play,
  Users,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  Smile,
  Meh,
  Frown,
  Target,
  BarChart3,
  User,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from "next-themes";

export default function Dashboard() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { client, loading: clientLoading, error: clientError } = useCurrentClient();
  const { stats, loading: statsLoading, error: statsError } = useClientDashboardStats(client?.client_id || null);
  const { activities, loading: activitiesLoading } = useRecentActivity(client?.client_id || null);
  const { region } = useTenant();
  const { data: enhancedData, loading: enhancedLoading } = useEnhancedDashboardData(client?.client_id || null, region);
  const navigate = useNavigate();

  const [pricingConfig, setPricingConfig] = useState<any>(null);

  const isClient = profile?.role === 'client';

  // Get region-specific currency
  const getCurrencyByRegion = (region: string) => {
    const currencyMap: Record<string, { code: string; symbol: string }> = {
      'au': { code: 'AUD', symbol: '$' },
      'uk': { code: 'GBP', symbol: '£' },
      'gb': { code: 'GBP', symbol: '£' },
      'us': { code: 'USD', symbol: '$' },
      'ca': { code: 'CAD', symbol: '$' },
      'in': { code: 'INR', symbol: '₹' },
      'nz': { code: 'NZD', symbol: '$' }
    };
    return currencyMap[region.toLowerCase()] || { code: 'USD', symbol: '$' };
  };

  const currencyInfo = getCurrencyByRegion(region);

  // Fetch pricing config
  useEffect(() => {
    async function fetchPricing() {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('currency', currencyInfo.code)
        .single();

      if (error) {
        console.error('Error fetching pricing:', error);
      } else if (data) {
        setPricingConfig(data);
      }
    }

    if (currencyInfo.code) {
      fetchPricing();
    }
  }, [currencyInfo.code]);

  const creditData = {
    balance: enhancedData?.creditBalance || stats?.currentBalance || 0,
    currency: currencyInfo.code,
    currencySymbol: currencyInfo.symbol,
    callsRemaining: enhancedData?.callsRemaining || 0,
    callsThisMonth: enhancedData?.callsThisMonth || stats?.callsThisMonth || 0,
    averageCallCost: pricingConfig?.per_call_price || 2.00,
    lowBalanceThreshold: 5
  };

  const isLowBalance = creditData.callsRemaining <= creditData.lowBalanceThreshold;
  const callsUsedPercentage = creditData.callsThisMonth > 0
    ? ((creditData.callsThisMonth / (creditData.callsThisMonth + creditData.callsRemaining)) * 100)
    : 0;

  // Navigation handlers
  const handleTestCall = () => navigate('./testing');
  const handleCustomerData = () => navigate('./call-data');
  const handleTopUp = () => navigate('./billing');
  const handleViewUsage = () => navigate('./call-data');

  // Get sentiment emoji
  const getSentimentDisplay = (score: number | null) => {
    if (score === null) return { icon: Meh, color: 'text-gray-400', label: 'N/A' };
    if (score >= 0.7) return { icon: Smile, color: 'text-green-500', label: 'Positive' };
    if (score >= 0.4) return { icon: Meh, color: 'text-yellow-500', label: 'Neutral' };
    return { icon: Frown, color: 'text-red-500', label: 'Negative' };
  };

  // Show loading state
  if (clientLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (clientError || statsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading dashboard</p>
          <p className="text-muted-foreground text-sm">{clientError || statsError}</p>
        </div>
      </div>
    );
  }

  // Show message if no client found
  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">No client configuration found for this URL</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure the region, industry, and client name in the URL are correct
          </p>
        </div>
      </div>
    );
  }

  const sentiment = getSentimentDisplay(enhancedData?.avgSentiment || null);

  return (
    <div className="space-y-8 font-manrope relative">
      {/* Subtle dotted background */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Low Balance Warning */}
      {isLowBalance && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert className="border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="font-medium">
              <span className="text-primary">Call limits approaching.</span> You have {creditData.callsRemaining} call{creditData.callsRemaining !== 1 ? 's' : ''} remaining.{' '}
              <Button variant="link" className="text-primary font-medium p-0 ml-1 h-auto underline" onClick={handleTopUp}>
                Please top up to continue
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-1"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-extralight mb-2">
              {client.business_name}
            </h1>
            <div className="flex items-center gap-2">
              <StatusDot status="active" label="Active" size="sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={handleTestCall} className="group">
              <Play className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Test Call
            </Button>
            <ModernButton variant="gradient" size="lg" onClick={handleCustomerData}>
              <Users className="mr-2 h-4 w-4" />
              {isClient ? "Call History" : "Customer Data"}
            </ModernButton>
          </div>
        </div>
      </motion.div>

      {/* Live Demo Section */}
      {isClient && <LiveDemoSection />}

      {/* Hero Stats Row - REAL DATA ONLY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* AI Persona Card - Smaller */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 overflow-hidden relative flex items-center gap-4"
        >
          {/* AI Avatar - Smaller rectangular */}
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-primary/10 to-primary/5">
            <img
              src="/assets/images/uifaces-human-avatar.jpg"
              alt="Sofia - AI Receptionist"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-medium text-base">Sofia</h3>
            <p className="text-xs text-muted-foreground">Your AI Receptionist</p>
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
              Online 24/7
            </Badge>
          </div>
        </motion.div>

        {/* Calls This Month - REAL */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Phone className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div>
            <AnimatedNumber
              value={enhancedData?.callsThisMonth || 0}
              className="text-4xl font-extralight"
            />
            <p className="text-sm text-muted-foreground mt-1">Calls This Month</p>
            <p className="text-xs text-muted-foreground/60 mt-1">total calls</p>
          </div>
        </motion.div>

        {/* Calls Remaining - REAL */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div>
            {enhancedData && enhancedData.callsRemaining !== null ? (
              <AnimatedNumber
                value={enhancedData.callsRemaining}
                className="text-4xl font-extralight text-green-500"
              />
            ) : (
              <span className="text-4xl font-extralight text-muted-foreground">--</span>
            )}
            <p className="text-sm text-muted-foreground mt-1">Calls Remaining</p>
            <p className="text-xs text-muted-foreground/60 mt-1">in current plan</p>
          </div>
        </motion.div>

        {/* Average Call Duration - REAL */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div>
            {enhancedData && enhancedData.avgCallDuration !== null ? (
              <div className="text-4xl font-extralight">
                <AnimatedNumber
                  value={enhancedData.avgCallDuration}
                  decimals={1}
                  suffix=" min"
                  className="text-4xl font-extralight"
                />
              </div>
            ) : (
              <span className="text-4xl font-extralight text-muted-foreground">--</span>
            )}
            <p className="text-sm text-muted-foreground mt-1">Avg Call Duration</p>
            <p className="text-xs text-muted-foreground/60 mt-1">average duration</p>
          </div>
        </motion.div>
      </div>

      {/* Charts & Insights Row - REAL DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours Chart - REAL */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 rounded-2xl border border-white/8 bg-white/[0.02] p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Call Volume by Hour</h3>
          </div>
          {enhancedData && enhancedData.callsByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={enhancedData.callsByHour}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                />
                <XAxis
                  dataKey="hour"
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}
                  tickFormatter={(hour) => `${hour}:00`}
                />
                <YAxis stroke={theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
                    border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#fff' : '#000'
                  }}
                  labelFormatter={(hour) => `${hour}:00`}
                />
                <Bar dataKey="calls" radius={[8, 8, 0, 0]}>
                  {enhancedData?.callsByHour.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hour === enhancedData?.peakHour ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No call data yet</p>
            </div>
          )}
          {enhancedData && enhancedData.peakHour !== null && (
            <p className="text-xs text-muted-foreground mt-4">
              Peak hour: <span className="text-primary font-medium">{enhancedData.peakHour}:00</span>
            </p>
          )}
        </motion.div>

        {/* Quick Insights - REAL */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-3"
        >
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Intent</p>
                <p className="text-lg font-medium mt-1">
                  {enhancedData?.topIntent || 'N/A'}
                </p>
              </div>
              <Target className="h-8 w-8 text-primary/30" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transfers</p>
                <p className="text-lg font-medium mt-1">
                  {enhancedData?.transferCount || 0}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {(enhancedData?.transferRate || 0).toFixed(1)}% rate
                </p>
              </div>
              <Phone className="h-8 w-8 text-primary/30" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-lg font-medium mt-1">
                  <AnimatedNumber value={creditData.callsThisMonth} />
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">total calls</p>
              </div>
              <Activity className="h-8 w-8 text-primary/30" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Credit Balance & Usage */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-2xl border border-white/8 bg-white/[0.02] p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Credit Balance</h3>
            </div>
            <AnimatedNumber
              value={creditData.balance}
              decimals={2}
              prefix={creditData.currencySymbol}
              className="text-4xl font-extralight"
            />
            <p className="text-sm text-muted-foreground mt-2">
              ≈ {creditData.callsRemaining} calls remaining
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Monthly Usage</h3>
              <StatusDot status="active" label="Tracking" size="sm" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Calls used this month</span>
                <span className="font-semibold">{creditData.callsThisMonth} calls</span>
              </div>
              <div className="relative h-3">
                <div className="absolute inset-0 rounded-full bg-white/5" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${callsUsedPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-primary to-primary/80"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{callsUsedPercentage.toFixed(1)}% of capacity</span>
                <span>Est. {creditData.currencySymbol}{(creditData.callsThisMonth * creditData.averageCallCost).toFixed(2)}</span>
              </div>
            </div>
            {isClient && (
              <div className="flex gap-3 pt-4">
                <Button variant="outline" size="sm" onClick={handleViewUsage} className="flex-1">
                  View Usage History
                </Button>
                <ModernButton variant="gradient" size="sm" onClick={handleTopUp} className="flex-1">
                  Top Up Credits
                </ModernButton>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Business Info */}
      {isClient && <BusinessInfoSection />}

      {/* Live Call Monitoring & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="lg:col-span-2 space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-extralight flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Live Call Monitoring
            </h2>
            <p className="text-sm text-muted-foreground">Real-time call tracking with AI sentiment analysis</p>
          </div>
          <LiveCallMonitor clientId={client?.client_id} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-2xl font-extralight flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </h2>
            <p className="text-sm text-muted-foreground">Latest calls</p>
          </div>

          {activitiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center">
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground/60">Activity will appear here once calls are made</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <StatusDot
                      status={activity.status === "success" ? "success" : "error"}
                      size="sm"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{activity.details?.caller || 'Unknown'}</p>
                        <Badge
                          variant={activity.status === "success" ? "secondary" : "destructive"}
                          className="text-xs bg-white/5 border-white/10"
                        >
                          {activity.status === "success" ? "Completed" : "Failed"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.details?.duration
                            ? `${Math.floor(activity.details.duration / 60)}m ${activity.details.duration % 60}s`
                            : 'N/A'}
                        </span>
                        {activity.details?.cost > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${activity.details.cost.toFixed(2)}
                          </span>
                        )}
                        <span className="ml-auto">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
