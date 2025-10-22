import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { PaymentModal } from "@/components/billing/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Plus,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar
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

  const [pricingConfig, setPricingConfig] = useState<any>(null);

  // Fetch real credit data and pricing from database
  useEffect(() => {
    async function fetchCredits() {
      if (!client?.user_id) return;

      setLoadingCredits(true);

      // Fetch credits
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('user_id', client.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching credits:', error);
      } else if (data) {
        setCreditData(data);
      }

      // Fetch pricing config for current currency
      const { data: pricing, error: pricingError } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('currency', currency.code)
        .single();

      if (pricingError) {
        console.error('Error fetching pricing:', pricingError);
      } else if (pricing) {
        setPricingConfig(pricing);
      }

      setLoadingCredits(false);
    }

    fetchCredits();
  }, [client?.user_id, currency.code]);

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

  // Real data from database
  const currentBalance = creditData?.balance || 0;
  const callCost = pricingConfig?.per_call_price || 2; // Get from pricing_config
  const estimatedCallsRemaining = Math.floor(currentBalance / callCost);

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
    <div className="space-y-6 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="space-y-2">
        <h1 className="text-5xl font-extralight mb-2">Billing & Credits</h1>
        <p className="text-muted-foreground">
          Manage your credits and payment methods
        </p>
      </div>

      {/* Row 1: Available Calls & Usage + Add Credits */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Available Calls & This Month's Usage */}
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extralight">Available Calls</h2>
              </div>
              <Badge className={subscriptionActive ? "bg-green-500" : "bg-gray-500"}>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{estimatedCallsRemaining + includedCalls}</span>
              <span className="text-2xl text-muted-foreground">calls total</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-sm font-medium">{includedCalls} included calls</span>
                </div>
                <span className="text-sm text-muted-foreground">{currency.symbol}{subscriptionPrice}/mo subscription</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">{estimatedCallsRemaining} additional calls</span>
                </div>
                <span className="text-sm text-muted-foreground">{currency.symbol}{currentBalance} credit balance</span>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Next billing date
                </span>
                <span className="font-medium">{nextBillingDate}</span>
              </div>
            </div>

            {/* This Month's Usage Section */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">This Month's Usage</h3>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total calls</span>
                <span className="text-2xl font-bold">{callsUsedThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Included calls used</span>
                <span className="text-lg font-medium">{Math.min(callsUsedThisMonth, includedCalls)} / {includedCalls}</span>
              </div>
              {overageCalls > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Additional calls</span>
                  <span className="text-lg font-medium">{overageCalls} calls</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
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
          </CardContent>
        </Card>

        {/* Right: Add Credits - Slider Based */}
        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-extralight">Add Credits</h2>
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

          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Calls selected</span>
              <span className="font-medium">{topupCalls[0]} calls</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cost per call</span>
              <span className="font-medium">{currency.symbol}{callCost}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Total amount</span>
              <span className="text-2xl font-bold">{currency.symbol}{topupAmount}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleAddCredits}
            disabled={isAddingCredits}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {currency.symbol}{topupAmount} Credits
          </Button>

          <div className="grid grid-cols-3 gap-2">
            {[25, 50, 100].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setTopupCalls([preset])}
                className="text-xs"
              >
                {preset} calls
              </Button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Row 2: Payment Method & Invoice History - Merged */}
      <div className="space-y-6">
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
          <Button variant="outline" size="sm" onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>

        <div className="space-y-6">
          {/* Payment Method Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Payment Method</h3>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-center w-10 h-10 rounded bg-background">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">No payment method added</p>
                <p className="text-xs text-muted-foreground">Add a card to auto-refill credits</p>
              </div>
              <Button
                size="sm"
                onClick={handleAddCredits}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
          </div>

          {/* Invoice History Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Invoice History</h3>
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
              <p>No invoices yet</p>
              <p className="text-sm">Your purchase history will appear here</p>
            </div>
          </div>
        </div>
      </div>

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
