import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ModernButton } from "@/components/ui/modern-button";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  TrendingUp,
  Download,
  Loader2,
  CheckCircle,
  Calendar,
  Zap,
  ArrowRight,
  AlertCircle,
  Settings,
  Sparkles
} from "lucide-react";

export default function Billing() {
  const { client, loading, refetch } = useCurrentClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine plan status
  const isPaidUser = client?.paid_plan === true;
  const planId = client?.plan_id || null;

  // Minute tracking
  const minutesUsed = isPaidUser
    ? client?.paid_minutes_used || 0
    : client?.trial_minutes_used || 0;
  const minutesTotal = isPaidUser
    ? client?.paid_minutes_included || 500
    : client?.trial_minutes || 30;
  const minutesRemaining = Math.max(0, minutesTotal - minutesUsed);

  // Plan details from plan_id
  const getPlanDetails = () => {
    if (!isPaidUser || !planId) {
      return { name: 'Free Trial', price: 0, overageRate: 0, billingPeriod: 'trial' };
    }

    // Parse plan_id (e.g., 'website_500_yearly' or 'phone_500')
    const isYearly = planId.includes('_yearly');
    const basePlanId = planId.replace('_yearly', '');

    const planMap: Record<string, { name: string; monthlyPrice: number; yearlyPrice: number; monthlyOverage: number; yearlyOverage: number }> = {
      'website_500': { name: 'Website Widget Only', monthlyPrice: 99, yearlyPrice: 990, monthlyOverage: 0.15, yearlyOverage: 0.10 },
      'phone_500': { name: 'Phone Only', monthlyPrice: 129, yearlyPrice: 1290, monthlyOverage: 0.15, yearlyOverage: 0.10 },
      'complete_1000': { name: 'Phone + Website', monthlyPrice: 179, yearlyPrice: 1790, monthlyOverage: 0.12, yearlyOverage: 0.10 }
    };

    const plan = planMap[basePlanId];
    if (!plan) return { name: 'Unknown Plan', price: 0, overageRate: 0, billingPeriod: 'monthly' };

    return {
      name: plan.name,
      price: isYearly ? plan.yearlyPrice : plan.monthlyPrice,
      overageRate: isYearly ? plan.yearlyOverage : plan.monthlyOverage,
      billingPeriod: isYearly ? 'yearly' : 'monthly'
    };
  };

  const planDetails = getPlanDetails();

  // Calculate overage
  const overageMinutes = Math.max(0, minutesUsed - minutesTotal);
  const overageCost = overageMinutes * planDetails.overageRate;
  const totalCost = planDetails.price + overageCost;

  // Billing cycle
  const billingCycleStart = client?.billing_cycle_start
    ? new Date(client.billing_cycle_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'N/A';
  const billingCycleEnd = client?.billing_cycle_end
    ? new Date(client.billing_cycle_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  const handleUpgradePlan = async (targetPlanId: string) => {
    console.log('[Billing] Creating checkout for plan:', targetPlanId);

    setIsProcessingCheckout(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to upgrade your plan",
          variant: "destructive"
        });
        return;
      }

      // Call edge function to create DodoPayments checkout session
      const { data, error } = await supabase.functions.invoke('create-dodo-checkout', {
        body: {
          plan_id: targetPlanId,
          user_id: user.id
        }
      });

      if (error || !data?.checkout_url) {
        console.error('[Billing] Checkout creation failed:', error);
        toast({
          title: "Error",
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive"
        });
        setIsProcessingCheckout(false);
        return;
      }

      console.log('[Billing] Redirecting to checkout:', data.checkout_url);

      // Redirect to DodoPayments hosted checkout
      window.location.href = data.checkout_url;

    } catch (error: any) {
      console.error('[Billing] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process checkout",
        variant: "destructive"
      });
      setIsProcessingCheckout(false);
    }
  };

  const handleCancelSubscription = () => {
    console.log('[Billing] Cancel subscription - TODO');
  };

  const handleDownloadInvoice = () => {
    console.log('[Billing] Download invoice - TODO');
  };

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
        <h1 className="text-5xl font-extralight mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your plan, usage, and payment methods
        </p>
      </motion.div>

      {/* Row 1: Current Plan Card */}
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
            <h2 className="text-2xl font-extralight">Current Plan</h2>
          </div>
          <Badge className={isPaidUser ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>
            {isPaidUser ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              "Trial"
            )}
          </Badge>
        </div>

        {/* Plan Name & Price */}
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-3">
            <h3 className="text-4xl font-extralight">{planDetails.name}</h3>
            {isPaidUser && (
              <Badge variant="outline" className="capitalize">
                {planDetails.billingPeriod}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-extralight">
              ${planDetails.price}{isPaidUser ? `/${planDetails.billingPeriod === 'yearly' ? 'yr' : 'mo'}` : ''}
            </div>
            {!isPaidUser && (
              <div className="text-sm text-muted-foreground">Free Trial</div>
            )}
          </div>
        </div>

        {/* Minutes Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Minutes Used This Month</span>
            <div className="flex items-center gap-2">
              <AnimatedNumber value={minutesUsed} className="text-2xl font-extralight" />
              <span className="text-muted-foreground">/ {minutesTotal} mins</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/[0.05] dark:bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                minutesUsed >= minutesTotal ? 'bg-red-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min((minutesUsed / minutesTotal) * 100, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {minutesRemaining > 0
                ? `${minutesRemaining} minutes remaining`
                : 'Limit reached - overage charges apply'
              }
            </span>
            {isPaidUser && (
              <span className="text-muted-foreground">
                Overage: ${planDetails.overageRate.toFixed(2)}/min
              </span>
            )}
          </div>
        </div>

        {/* Overage Alert */}
        {isPaidUser && overageMinutes > 0 && (
          <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Overage Charges Active</p>
              <p className="text-xs text-muted-foreground">
                You have reached your base plan limit of {minutesTotal} minutes.
                You are now incurring overage charges at <strong>${planDetails.overageRate.toFixed(2)}/minute</strong>.
                This is just a notification, no action required from your end.
              </p>
            </div>
          </div>
        )}

        {/* Usage Breakdown */}
        <div className="space-y-3 pt-3 border-t border-black/[0.05] dark:border-white/5">
          <h4 className="text-sm font-medium">Usage Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-muted-foreground">
                {isPaidUser ? 'Minutes Included' : 'Trial Minutes Allocated'}
              </span>
              <span className="font-medium">{minutesTotal} mins</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-muted-foreground">Minutes Used</span>
              <span className="font-medium">{minutesUsed} mins</span>
            </div>
            {isPaidUser && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="text-muted-foreground">Over-usage Triggered</span>
                <span className={`font-medium ${overageMinutes > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {overageMinutes > 0 ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            {isPaidUser && overageMinutes > 0 && (
              <>
                <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <span className="text-muted-foreground">Current Over-used Minutes</span>
                  <span className="font-medium text-orange-500">{overageMinutes} mins</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <span className="text-muted-foreground">Current Over-usage Cost (at ${planDetails.overageRate.toFixed(2)}/min)</span>
                  <span className="font-medium text-orange-500">${overageCost.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 pb-1">
                  This will be adjusted in your next billing on <strong>{billingCycleEnd}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Billing Cycle (Paid users only) */}
        {isPaidUser && (
          <div className="flex items-center justify-between text-sm pt-3 border-t border-black/[0.05] dark:border-white/5">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Current billing cycle
            </span>
            <span className="font-medium">{billingCycleStart} - {billingCycleEnd}</span>
          </div>
        )}

        {/* Upgrade/Downgrade Buttons */}

        <div className="flex flex-col gap-3">
          {!isPaidUser && (
            <>
              {/* Free Trial: Show both Monthly + Yearly */}
              <div className="flex gap-3">
                <ModernButton
                  className="flex-1"
                  size="lg"
                  onClick={() => {
                    const basePlan = client?.channel_type === 'both' ? 'complete_1000' :
                                    client?.channel_type === 'website' ? 'website_500' : 'phone_500';
                    handleUpgradePlan(basePlan);
                  }}
                  disabled={isProcessingCheckout}
                >
                  {isProcessingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Upgrade to Monthly
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </ModernButton>
                <div className="relative flex-1">
                  <ModernButton
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      const basePlan = client?.channel_type === 'both' ? 'complete_1000' :
                                      client?.channel_type === 'website' ? 'website_500' : 'phone_500';
                      handleUpgradePlan(`${basePlan}_yearly`);
                    }}
                    disabled={isProcessingCheckout}
                  >
                    {isProcessingCheckout ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Upgrade to Yearly
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </ModernButton>
                  <div className="absolute -top-3 right-2 px-2 py-0.5 rounded-md bg-green-500 text-white text-xs font-medium whitespace-nowrap">
                    Get 2 months free
                  </div>
                </div>
              </div>
            </>
          )}

          {isPaidUser && planDetails.billingPeriod === 'monthly' && (
            <>
              {/* Monthly Plan: Show only Yearly upgrade */}
              <div className="relative">
                <ModernButton
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    const basePlan = planId?.replace('_yearly', '') || '';
                    handleUpgradePlan(`${basePlan}_yearly`);
                  }}
                  disabled={isProcessingCheckout}
                >
                  {isProcessingCheckout ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Upgrade to Yearly Plan
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </ModernButton>
                <div className="absolute -top-3 right-2 px-2 py-0.5 rounded-md bg-green-500 text-white text-xs font-medium whitespace-nowrap">
                  Get 2 months free
                </div>
              </div>
            </>
          )}

        </div>

        {/* Cancel Subscription Link (left-aligned, red text) */}
        {isPaidUser && (
          <button
            onClick={handleCancelSubscription}
            className="text-sm text-red-500 hover:text-red-600 underline underline-offset-2 transition-colors"
          >
            Cancel Subscription
          </button>
        )}
      </motion.div>

      {/* Row 2: This Month's Usage (Paid users only) */}
      {isPaidUser && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-2xl font-extralight">This Month's Charges</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-sm text-muted-foreground">Base Package</span>
              <span className="text-lg font-medium">${planDetails.price.toFixed(2)}</span>
            </div>

            {overageMinutes > 0 && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Overage Charges</span>
                  <span className="text-xs text-muted-foreground">{overageMinutes} minutes × ${planDetails.overageRate.toFixed(2)}/min</span>
                </div>
                <span className="text-lg font-medium text-orange-500">${overageCost.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-black/[0.05] dark:border-white/5">
              <span className="text-sm font-medium">Total This Month</span>
              <div className="text-right">
                <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
                {overageMinutes === 0 && (
                  <div className="text-xs text-muted-foreground">Included in base package</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <hr className="border-black/[0.05] dark:border-white/5" />
      </motion.div>

      {/* Row 3: Payment & Invoices */}
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
              Your payment history and invoices
            </p>
          </div>
          <ModernButton variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </ModernButton>
        </div>

        {/* Payment Method Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Payment Method</h3>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/[0.05] border border-white/5">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isPaidUser ? 'Card on file' : 'No payment method added'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPaidUser ? 'Payment processed via Razorpay' : 'Upgrade to add a payment method'}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice History Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Invoice History</h3>
          <div className="text-center py-12 text-muted-foreground rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm mt-1">Your billing history will appear here</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
