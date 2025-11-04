import { useState } from "react";
import { ModernButton } from "@/components/ui/modern-button";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  ArrowLeft,
  Zap,
  Globe,
  Phone as PhoneIcon,
  Sparkles
} from "lucide-react";

type PlanId = 'website_500' | 'phone_500' | 'complete_1000';

interface PlanDetails {
  id: PlanId;
  name: string;
  price: number;
  minutes: number;
  overageRate: number;
  icon: typeof Globe;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanDetails[] = [
  {
    id: 'website_500',
    name: 'Website Widget Only',
    price: 99,
    minutes: 500,
    overageRate: 0.15,
    icon: Globe,
    features: [
      '500 minutes included',
      'Website chat widget',
      'Lead capture forms',
      'Real-time analytics',
      'Unlimited conversations',
      'Custom branding'
    ]
  },
  {
    id: 'complete_1000',
    name: 'Phone + Website',
    price: 179,
    minutes: 1000,
    overageRate: 0.12,
    icon: Sparkles,
    features: [
      '1000 minutes included',
      'Phone + Website Widget',
      'All features included',
      'Priority support',
      'Advanced AI capabilities',
      'Best value for money'
    ],
    popular: true
  },
  {
    id: 'phone_500',
    name: 'Phone Only',
    price: 129,
    minutes: 500,
    overageRate: 0.15,
    icon: PhoneIcon,
    features: [
      '500 minutes included',
      'Inbound phone calls',
      'Call recordings & transcripts',
      'Call routing',
      'Voicemail handling',
      'Business hours support'
    ]
  }
];

export default function BillingChange() {
  const { client, loading } = useCurrentClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPaidUser = client?.paid_plan === true;
  const channelType = client?.channel_type || 'phone';

  // Determine recommended plan based on channel_type
  const recommendedPlan = channelType === 'both'
    ? 'complete_1000'
    : channelType === 'website'
    ? 'website_500'
    : 'phone_500';

  const handleSelectPlan = async (planId: PlanId) => {
    setSelectedPlan(planId);
    // Append _yearly suffix for annual plans (e.g., website_500_yearly)
    const finalPlanId = billingPeriod === 'yearly' ? `${planId}_yearly` : planId;
    // Replace /change with /payment in current path to maintain tenant context
    // e.g., /us/saas/flexprice/billing/change -> /us/saas/flexprice/billing/payment
    const paymentPath = location.pathname.replace('/change', '/payment');
    navigate(`${paymentPath}?plan=${finalPlanId}`);
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page (billing)
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
        <h1 className="text-5xl font-extralight mb-2">
          {isPaidUser ? 'Change Your Plan' : 'Choose Your Plan'}
        </h1>
        <p className="text-muted-foreground">
          Select the plan that best fits your needs. All plans include unlimited usage with overage pricing.
        </p>
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
              2 Months FREE
            </div>
          </div>
        </div>
      </motion.div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {PLANS.map((plan, index) => {
          const Icon = plan.icon;
          const isRecommended = plan.id === recommendedPlan;

          // Calculate yearly pricing (10 months for 12 = 2 months free)
          const displayPrice = billingPeriod === 'yearly' ? plan.price * 10 : plan.price;
          const displayMinutes = billingPeriod === 'yearly' ? plan.minutes * 12 : plan.minutes;
          const displayOverageRate = billingPeriod === 'yearly' ? 0.10 : plan.overageRate;
          const yearlySavings = plan.price * 2; // 2 months free

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`cursor-pointer rounded-2xl transition-all duration-300 relative ${
                plan.popular
                  ? 'p-12 border border-primary transform md:scale-105'
                  : 'p-8 border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)]'
              }`}
              style={plan.popular ? {
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)'
              } : {}}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-medium">
                    MOST POPULAR
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className="text-center mb-6">
                <div className={`inline-block p-3 rounded-xl mb-4 ${
                  plan.popular
                    ? 'bg-gradient-to-br from-primary to-primary/80'
                    : 'bg-black/[0.05] dark:bg-white/[0.05]'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-medium mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">AI for your business</p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <div className="text-5xl font-light mb-2">
                  ${displayPrice}
                  <span className="text-2xl text-muted-foreground">/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {displayMinutes.toLocaleString()} minutes {billingPeriod === 'yearly' ? 'per year' : 'per month'}
                </p>
                {billingPeriod === 'yearly' && (
                  <p className="text-sm text-green-500 font-medium mt-1">
                    Save ${yearlySavings} per year
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-sm font-light">{feature}</span>
                  </div>
                ))}
                <div className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-sm font-light">${displayOverageRate.toFixed(2)}/min overage</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`block w-full px-6 py-3 rounded-md text-center font-medium transition-colors ${
                  plan.popular
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-white text-black dark:bg-white dark:text-black hover:bg-gray-100'
                }`}
              >
                Select Plan
              </button>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
