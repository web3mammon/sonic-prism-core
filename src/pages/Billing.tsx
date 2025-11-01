import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ModernButton } from "@/components/ui/modern-button";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { PaymentModal } from "@/components/billing/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Plus,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Zap,
  ArrowRight
} from "lucide-react";

export default function Billing() {
  const { client, loading } = useCurrentClient();
  const { region } = useTenant();
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  const [topupCalls, setTopupCalls] = useState([50]); // Slider value for number of calls
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [creditData, setCreditData] = useState<any>(null);
  const [loadingCredits, setLoadingCredits] = useState(true);

  // Get region-specific currency from URL path
  const getCurrency = () => {
    const currencyMap: Record<string, { code: string; symbol: string }> = {
      'au': { code: 'AUD', symbol: '$' },
      'uk': { code: 'GBP', symbol: '£' },
      'gb': { code: 'GBP', symbol: '£' },
      'us': { code: 'USD', symbol: '$' },
      'ca': { code: 'CAD', symbol: '$' },
      'in': { code: 'INR', symbol: '₹' },
    };
    return currencyMap[region?.toLowerCase() || 'us'] || { code: 'USD', symbol: '$' };
  };

  const currency = getCurrency();
  const channelType = client?.channel_type || 'phone';

  const [pricingConfig, setPricingConfig] = useState<any>(null);

  // Fetch real credit data and pricing from database
  useEffect(() => {
    async function fetchCredits() {
      if (!client?.client_id) return;

      setLoadingCredits(true);

      // ========================================
      // MINUTE-BASED USAGE TRACKING (NEW - Nov 1, 2025)
      // ========================================
      const hasMinuteTracking = client.trial_minutes !== undefined && client.trial_minutes !== null;
      const channelType = client.channel_type || 'phone';
      let balanceRemaining = 0;
      let totalAllocation = 0;

      if (hasMinuteTracking) {
        // NEW SYSTEM: Minute-based pricing
        const isOnPaidPlan = !!client.paid_plan_type;

        if (isOnPaidPlan) {
          // Paid plan user
          totalAllocation = client.paid_minutes_included || 0;
          balanceRemaining = Math.max(0, totalAllocation - (client.paid_minutes_used || 0));
        } else {
          // Trial user
          totalAllocation = client.trial_minutes || 30;
          balanceRemaining = Math.max(0, totalAllocation - (client.trial_minutes_used || 0));
        }
      } else {
        // OLD SYSTEM: Event-based (backwards compatibility)
        if (channelType === 'phone') {
          balanceRemaining = Math.max(0, (client.trial_calls || 0) - (client.trial_calls_used || 0));
          totalAllocation = client.trial_calls || 10;
        } else if (channelType === 'website') {
          balanceRemaining = Math.max(0, (client.trial_conversations || 0) - (client.trial_conversations_used || 0));
          totalAllocation = client.trial_conversations || 10;
        } else {
          // Both: total remaining
          const callsLeft = Math.max(0, (client.trial_calls || 0) - (client.trial_calls_used || 0));
          const convosLeft = Math.max(0, (client.trial_conversations || 0) - (client.trial_conversations_used || 0));
          balanceRemaining = callsLeft + convosLeft;
          totalAllocation = (client.trial_calls || 10) + (client.trial_conversations || 10);
        }
      }

      setCreditData({
        balance: balanceRemaining,
        credits: balanceRemaining
      });

      // NEW PRICING (November 1, 2025) - Minute-based plans
      setPricingConfig({
        base_price: hasMinuteTracking
          ? (client.paid_plan_type === 'website' ? 99 : client.paid_plan_type === 'phone' ? 129 : client.paid_plan_type === 'complete' ? 179 : 0)
          : (channelType === 'phone' ? 49 : channelType === 'website' ? 39 : 69),
        per_call_price: hasMinuteTracking ? 0.15 : (channelType === 'both' ? 1.50 : channelType === 'phone' ? 2.00 : 1.50),
        base_calls: totalAllocation,
        currency: currency.code
      });

      setLoadingCredits(false);
    }

    fetchCredits();
  }, [client?.client_id, client?.credits, currency.code]);

  // Handle payment redirect success/failure
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your credits have been added.');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  }, []);

  // Real data from database (per-client credits)
  const creditsRemaining = creditData?.credits || 0; // Each credit = 1 call/chat
  const callCost = pricingConfig?.per_call_price || 2; // Get from pricing_config (for paid plans)

  // Subscription data (from database and pricing_config)
  const subscriptionActive = (creditData?.calls_included || 0) > 0;
  const subscriptionPrice = pricingConfig?.base_price || creditData?.monthly_base_fee || 49;
  const includedCalls = pricingConfig?.base_calls || creditData?.calls_included || 20;
  const callsUsedThisMonth = 0; // TODO: Calculate from call_sessions table
  const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate overage (calls beyond included 20)
  const overageCalls = Math.max(0, callsUsedThisMonth - includedCalls);
  const overageCost = overageCalls * callCost;
  const totalCost = subscriptionPrice + overageCost;

  // Top-up calculation
  const topupAmount = topupCalls[0] * callCost;

  const handleAddCredits = () => {
    setShowPaymentModal(true);
  };

  const handleDownloadInvoice = () => {
    toast.info("Invoice download coming soon!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-5xl font-extralight mb-2">Billing & Credits</h1>
        <p className="text-muted-foreground">
          Manage your credits and payment methods
        </p>
      </motion.div>

      {/* Row 1: Available Calls & Usage + Add Credits */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Available Calls & This Month's Usage */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">
                {channelType === 'phone' ? 'Available Calls' :
                 channelType === 'website' ? 'Available Conversations' :
                 'Available Credits'}
              </h2>
            </div>
            <Badge className={subscriptionActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}>
              {subscriptionActive ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </>
              ) : (
                "Inactive"
              )}
            </Badge>
          </div>

          {/* Total Credits */}
          <div className="flex items-baseline gap-2">
            <AnimatedNumber
              value={creditsRemaining}
              className="text-5xl font-extralight"
            />
            <span className="text-2xl text-muted-foreground">
              {channelType === 'phone' ? 'calls remaining' :
               channelType === 'website' ? 'conversations remaining' :
               'credits remaining'}
            </span>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-sm font-medium">Free Trial</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {creditsRemaining} / {channelType === 'both' ? '20' : '10'} remaining
              </span>
            </div>

            <div className="flex items-center justify-between text-sm pt-3 border-t border-black/[0.05] dark:border-white/5">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next billing date
              </span>
              <span className="font-medium">{nextBillingDate}</span>
            </div>
          </div>

          {/* This Month's Usage Section */}
          <div className="pt-6 border-t border-black/[0.05] dark:border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">This Month's Usage</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {channelType === 'phone' ? 'Total calls' :
                   channelType === 'website' ? 'Total conversations' :
                   'Total interactions'}
                </span>
                <AnimatedNumber value={callsUsedThisMonth} className="text-2xl font-extralight" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {channelType === 'phone' ? 'Included calls used' :
                   channelType === 'website' ? 'Included conversations used' :
                   'Included usage'}
                </span>
                <span className="text-lg font-medium">{Math.min(callsUsedThisMonth, includedCalls)} / {includedCalls}</span>
              </div>
              {overageCalls > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {channelType === 'phone' ? 'Additional calls' :
                     channelType === 'website' ? 'Additional conversations' :
                     'Additional usage'}
                  </span>
                  <span className="text-lg font-medium text-primary">
                    {overageCalls} {channelType === 'phone' ? 'calls' :
                                    channelType === 'website' ? 'conversations' :
                                    'interactions'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-black/[0.05] dark:border-white/5">
                <span className="text-sm font-medium">Total this month</span>
                <div className="text-right">
                  <div className="text-lg font-bold">{currency.symbol}{totalCost}</div>
                  {overageCalls > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ({currency.symbol}{subscriptionPrice} + {currency.symbol}{overageCost} overage)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Add Credits - Slider Based */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">Add Credits</h2>
            </div>
            <p className="text-muted-foreground">
              Purchase credits for additional calls beyond your subscription
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Number of calls</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={topupCalls[0]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setTopupCalls([Math.max(1, Math.min(500, val))]);
                  }}
                  className="w-20 text-right"
                  min={1}
                  max={500}
                />
                <span className="text-sm text-muted-foreground">calls</span>
              </div>
            </div>

            <Slider
              value={topupCalls}
              onValueChange={setTopupCalls}
              min={1}
              max={500}
              step={5}
              className="w-full"
            />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>1 call</span>
              <span>500 calls</span>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Calls selected</span>
              <span className="font-medium">{topupCalls[0]} calls</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cost per call</span>
              <span className="font-medium">{currency.symbol}{callCost}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/5">
              <span className="font-medium">Total amount</span>
              <span className="text-2xl font-bold">{currency.symbol}{topupAmount}</span>
            </div>
          </div>

          <ModernButton
            className="w-full"
            size="lg"
            onClick={handleAddCredits}
            disabled={isAddingCredits}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {currency.symbol}{topupAmount} Credits
            <ArrowRight className="h-4 w-4 ml-2" />
          </ModernButton>

          <div className="grid grid-cols-3 gap-2">
            {[25, 50, 100].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setTopupCalls([preset])}
                className="text-xs border-white/10 hover:bg-white/[0.02] hover:border-white/20 transition-all"
              >
                {preset} calls
              </Button>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <hr className="border-black/[0.05] dark:border-white/5" />
      </motion.div>

      {/* Row 2: Payment Method & Invoice History - Merged */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-extralight flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment & Invoices
            </h2>
            <p className="text-muted-foreground">
              Manage your payment methods and download invoices
            </p>
          </div>
          <ModernButton variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </ModernButton>
        </div>

        <div className="space-y-6">
          {/* Payment Method Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Payment Method</h3>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/[0.05] border border-white/5">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">No payment method added</p>
                <p className="text-xs text-muted-foreground">Add a card to auto-refill credits</p>
              </div>
              <ModernButton
                size="sm"
                onClick={handleAddCredits}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </ModernButton>
            </div>
          </div>

          {/* Invoice History Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Invoice History</h3>
            <div className="text-center py-12 text-muted-foreground rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm mt-1">Your purchase history will appear here</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={topupAmount}
        calls={topupCalls[0]}
        currency={currency}
      />
    </div>
  );
}
