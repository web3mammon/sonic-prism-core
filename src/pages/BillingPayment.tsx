import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { ModernButton } from "@/components/ui/modern-button";
import { Badge } from "@/components/ui/badge";
import { PaymentForm } from "@/components/billing/PaymentForm";
import { motion } from "framer-motion";
import { useRazorpay, RazorpayOptions } from "react-razorpay";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Shield,
  Lock,
  CreditCard
} from "lucide-react";

type BasePlanId = 'website_500' | 'phone_500' | 'complete_1000';
type PlanId = BasePlanId | `${BasePlanId}_yearly`;

interface PlanDetails {
  id: BasePlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyMinutes: number;
  yearlyMinutes: number;
  monthlyOverageRate: number;
  yearlyOverageRate: number;
  description: string;
}

const PLANS: Record<BasePlanId, PlanDetails> = {
  website_500: {
    id: 'website_500',
    name: 'Website Widget Only',
    monthlyPrice: 99,
    yearlyPrice: 990,
    monthlyMinutes: 500,
    yearlyMinutes: 6000,
    monthlyOverageRate: 0.15,
    yearlyOverageRate: 0.10,
    description: 'Perfect for website chat support'
  },
  phone_500: {
    id: 'phone_500',
    name: 'Phone Only',
    monthlyPrice: 129,
    yearlyPrice: 1290,
    monthlyMinutes: 500,
    yearlyMinutes: 6000,
    monthlyOverageRate: 0.15,
    yearlyOverageRate: 0.10,
    description: 'Ideal for phone-based customer service'
  },
  complete_1000: {
    id: 'complete_1000',
    name: 'Phone + Website',
    monthlyPrice: 179,
    yearlyPrice: 1790,
    monthlyMinutes: 1000,
    yearlyMinutes: 12000,
    monthlyOverageRate: 0.12,
    yearlyOverageRate: 0.10,
    description: 'Best value for phone + website'
  }
};

export default function BillingPayment() {
  const { client, loading } = useCurrentClient();
  const navigate = useNavigate();
  const { error: razorpayError, isLoading: razorpayLoading, Razorpay } = useRazorpay();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auto-detect plan from channel_type
  const basePlanId: BasePlanId =
    client?.channel_type === 'both' ? 'complete_1000' :
    client?.channel_type === 'website' ? 'website_500' :
    'phone_500';

  const selectedPlan = PLANS[basePlanId];

  // Calculate display values based on billing period
  const displayPrice = billingPeriod === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
  const displayMinutes = billingPeriod === 'yearly' ? selectedPlan.yearlyMinutes : selectedPlan.monthlyMinutes;
  const displayOverageRate = billingPeriod === 'yearly' ? selectedPlan.yearlyOverageRate : selectedPlan.monthlyOverageRate;
  const yearlySavings = (selectedPlan.monthlyPrice * 12) - selectedPlan.yearlyPrice;

  // Final plan_id to send to backend
  const finalPlanId: PlanId = billingPeriod === 'yearly' ? `${basePlanId}_yearly` : basePlanId;

  const handlePaymentSubmit = async (cardDetails: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  }) => {
    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      // Step 1: Create Razorpay order
      const orderResponse = await fetch('https://btqccksigmohyjdxgrrj.supabase.co/functions/v1/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: finalPlanId,  // e.g., 'website_500' or 'website_500_yearly'
          currency: 'USD',
          user_id: client?.user_id,
          client_id: client?.client_id
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const { order_id, amount, currency } = await orderResponse.json();

      // Step 2: Open Razorpay Checkout
      if (!Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      // Define verification function (called after Razorpay success)
      const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
        try {
          const verifyResponse = await fetch('https://btqccksigmohyjdxgrrj.supabase.co/functions/v1/verify-razorpay-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: orderId,
              payment_id: paymentId,
              razorpay_signature: signature,
              plan_id: finalPlanId,
              user_id: client?.user_id,
              client_id: client?.client_id
            })
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.error || 'Payment verification failed');
          }

          // Success!
          setPaymentSuccess(true);
          setPaymentProcessing(false);

          // Redirect to billing page after 2 seconds
          setTimeout(() => {
            navigate(-2);
          }, 2000);
        } catch (error) {
          console.error('Verification error:', error);
          setPaymentError(error instanceof Error ? error.message : 'Payment verification failed');
          setPaymentProcessing(false);
        }
      };

      const options: RazorpayOptions = {
        key: 'rzp_test_RaTNNdN22yll3Q', // From rzp-key.csv (test key)
        amount: amount, // Amount in paise from backend
        currency: currency,
        name: 'Klariqo',
        description: `${selectedPlan.name} - ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Plan`,
        order_id: order_id,
        handler: async function (response) {
          // Payment successful - Razorpay returns these values
          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = response;

          // Step 3: Verify payment on backend
          await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        },
        prefill: {
          name: client?.business_name || '',
          email: '', // Could add user email if available
        },
        theme: {
          color: '#ef4444', // Our primary red color
        },
        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
            setPaymentError('Payment cancelled');
          }
        }
      };

      const razorpayInstance = new Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Show success screen
  if (paymentSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-4 max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-3xl font-extralight">Payment Successful!</h2>
          <p className="text-muted-foreground">
            Your subscription to <strong>{selectedPlan.name}</strong> is now active.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting you back to billing...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 font-manrope relative max-w-4xl mx-auto">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ModernButton
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          disabled={paymentProcessing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </ModernButton>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2 text-center"
      >
        <h1 className="text-5xl font-extralight mb-2">Complete Your Purchase</h1>
      </motion.div>

      {/* Billing Period Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex justify-center"
      >
        <div className="relative inline-flex items-center gap-2 p-1 rounded-xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billingPeriod === 'yearly'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Yearly
          </button>

          {/* Floating Badge */}
          <div className="absolute -top-6 right-0 transform translate-x-2">
            <div className="px-2 py-1 rounded-md bg-green-500 text-white text-xs font-semibold shadow-md whitespace-nowrap">
              Save ${yearlySavings}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Left: Order Summary */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="md:col-span-2 h-full"
        >
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-4 h-full">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Order Summary
            </h3>

            <div className="space-y-4">
              {/* Plan Details */}
              <div className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedPlan.name}</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Selected
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base Price</span>
                  <span className="font-medium">${displayPrice}/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Minutes Included</span>
                  <span className="font-medium">{displayMinutes.toLocaleString()} mins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Overage Rate</span>
                  <span className="font-medium">${displayOverageRate.toFixed(2)}/min</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <div className="flex items-center justify-between text-green-600">
                    <span className="font-medium">Yearly Savings</span>
                    <span className="font-semibold">${yearlySavings}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-black/[0.05] dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Due Today</span>
                  <span className="text-2xl font-bold">${displayPrice}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Billed {billingPeriod}. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: Payment Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-3"
        >
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6">
            <h3 className="text-xl font-semibold">Payment Details</h3>

            {paymentError && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-sm">
                {paymentError}
              </div>
            )}

            <PaymentForm
              onSubmit={handlePaymentSubmit}
              isProcessing={paymentProcessing}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
