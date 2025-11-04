import { useOnboarding } from "@/contexts/OnboardingContext";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressSteps } from "@/components/onboarding/ProgressSteps";
import { ChannelCard } from "@/components/onboarding/ChannelCard";
import { ChannelType } from "@/contexts/OnboardingContext";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ModernButton } from "@/components/ui/modern-button";
import { Loader2, Edit2, Check, Eye, EyeOff, Sparkles, Mail } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

export default function Onboarding() {
  const navigate = useNavigate();
  const { state, updateState, nextStep, goToStep } = useOnboarding();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");

  // Track onboarding page view on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_page_view', {
        'page_path': '/onboarding'
      });
    }
  }, []);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Step 4: Account Setup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Step 4: Voice selection
  const [voices, setVoices] = useState<any[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  // Step 6: Provisioning state
  const [provisioningState, setProvisioningState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [dashboardUrl, setDashboardUrl] = useState<string>('');

  // Load voices when Step 4 (voice selection) is reached
  useEffect(() => {
    if (state.currentStep === 4) {
      loadVoices();
    }
  }, [state.currentStep]);

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const { data, error } = await supabase
        .from('voice_profiles')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setVoices(data || []);
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const playVoiceDemo = (voiceId: string, demoUrl: string) => {
    if (playingVoice === voiceId) {
      // Stop playing
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);
    const audio = new Audio(demoUrl);
    audio.play();
    audio.onended = () => setPlayingVoice(null);
  };

  // Step 6: Confetti effect (must be at top level, not in switch case)
  useEffect(() => {
    if (state.currentStep === 6) {
      // Subtle confetti effect
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#ffffff', '#e0e0e0', '#c0c0c0']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#ffffff', '#e0e0e0', '#c0c0c0']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [state.currentStep]);

  const handleChannelSelect = (channelType: ChannelType) => {
    updateState({ channel_type: channelType });

    // Track channel selection
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_step_2_complete', {
        'channel_type': channelType
      });
    }

    nextStep();
  };

  const loadingMessages = [
    "🦛 Flying hippos analyzing your website...",
    "🔍 Searching for business secrets...",
    "💰 Finding your pricing (the good stuff)...",
    "🎯 Identifying your target audience...",
    "✨ Extracting your superpowers...",
    "🧠 Understanding your business genius...",
    "📊 Crunching the data (nom nom nom)...",
    "🎨 Analyzing your vibe...",
  ];

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl) return;

    setIsAnalyzing(true);

    // Cycle through fun loading messages
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      setCurrentLoadingMessage(loadingMessages[messageIndex]);
      messageIndex = (messageIndex + 1) % loadingMessages.length;
    }, 2000);

    try {
      const response = await fetch(
        'https://btqccksigmohyjdxgrrj.supabase.co/functions/v1/analyze-website',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: websiteUrl })
        }
      );

      const data = await response.json();

      clearInterval(messageInterval);

      if (data.success) {
        updateState({
          website_url: websiteUrl,
          analysis: data.analysis,
          system_prompt: data.system_prompt
        });
        setIsAnalyzing(false);

        // Track website analysis completion
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'onboarding_step_1_complete', {
            'website_url': websiteUrl
          });
        }

        nextStep();
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      clearInterval(messageInterval);
      setIsAnalyzing(false);
      console.error('Website analysis error:', error);
      alert('Failed to analyze website. Please check the URL and try again.');
    }
  };

  // Generate system prompt from manual data (client-side)
  const generatePromptFromManualData = () => {
    const analysis = state.analysis || {};
    const { business_name, industry, services, pricing, target_audience, tone, usps } = analysis;

    let prompt = `You are an AI assistant for ${business_name || '[Business Name]'}, a ${industry || '[Industry]'} business.\n\n`;

    // Add services
    if (services && services.length > 0) {
      prompt += `Main services offered:\n`;
      services.forEach((service: string) => {
        prompt += `- ${service}\n`;
      });
      prompt += `\n`;
    }

    // Add pricing if available
    if (pricing && pricing !== 'Not available') {
      prompt += `Pricing: ${pricing}\n\n`;
    }

    // Add target audience
    if (target_audience) {
      prompt += `Target audience: ${target_audience}\n\n`;
    }

    // Add tone instruction
    if (tone) {
      prompt += `Your tone should be ${tone}. `;
    }

    // Add USPs
    if (usps && usps.length > 0) {
      prompt += `Highlight these key benefits: ${usps.join(', ')}.\n\n`;
    }

    // Add responsibilities
    prompt += `Your responsibilities:\n`;
    prompt += `1. Answer customer questions about our services\n`;
    prompt += `2. Provide pricing information when asked\n`;
    prompt += `3. Book appointments or demos when requested\n`;
    prompt += `4. Qualify leads by understanding their needs\n`;
    prompt += `5. Escalate complex issues to a human representative\n\n`;

    prompt += `Always be helpful, accurate, and represent ${business_name || '[Business Name]'} professionally.`;

    updateState({ system_prompt: prompt });
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Get country code prefix based on location
  const getCountryCodePrefix = (location: string): string => {
    switch (location) {
      case 'US':
      case 'CA':
        return '+1 ';
      case 'AU':
        return '+61 ';
      case 'UK':
        return '+44 ';
      default:
        return '+1 ';  // Default to US/CA
    }
  };

  // Get phone number length requirements (digits only) based on location
  const getPhoneLength = (location: string): { min: number; max: number } => {
    switch (location) {
      case 'US':
      case 'CA':
        return { min: 10, max: 10 }; // Exactly 10 digits for US/CA
      case 'AU':
        return { min: 9, max: 9 }; // Exactly 9 digits for Australia
      case 'UK':
        return { min: 10, max: 10 }; // Exactly 10 digits for UK
      default:
        return { min: 10, max: 10 }; // Default to 10 digits
    }
  };

  // Format phone as user types based on location
  const formatPhoneInput = (value: string, location: string): string => {
    const prefix = getCountryCodePrefix(location);
    // Remove prefix and non-digits
    const withoutPrefix = value.replace(prefix, '');
    const digits = withoutPrefix.replace(/\D/g, '');

    // Enforce max length
    const { max } = getPhoneLength(location);
    const limitedDigits = digits.substring(0, max);

    // Format based on location
    switch (location) {
      case 'US':
      case 'CA':
        // Format: +1 (xxx) xxx-xxxx
        if (limitedDigits.length <= 3) {
          return prefix + limitedDigits;
        } else if (limitedDigits.length <= 6) {
          return `${prefix}(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
        } else {
          return `${prefix}(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
        }

      default:
        // Simple format for other countries
        return prefix + limitedDigits;
    }
  };

  // Validate phone number
  const isPhoneValid = (phone: string, location: string): boolean => {
    const prefix = getCountryCodePrefix(location);
    // Remove prefix first, then extract only digits
    const withoutPrefix = phone.replace(prefix, '');
    const digits = withoutPrefix.replace(/\D/g, '');
    const { min, max } = getPhoneLength(location);
    return digits.length >= min && digits.length <= max;
  };

  // Handle account creation
  const handleCreateAccount = async () => {
    setSignupError(null);
    setEmailError(null);
    setTermsError(null);

    // Validation
    if (!fullName || !email || !password) {
      setSignupError('Please fill in all required fields');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address (e.g., name@example.com)');
      return;
    }

    if (password.length < 8) {
      setSignupError('Password must be at least 8 characters');
      return;
    }

    // Phone number is optional, but validate if provided
    const location = state.analysis?.business_location || 'US';
    if (phoneNumber && phoneNumber.trim() !== '' && !isPhoneValid(phoneNumber, location)) {
      setSignupError(`Please enter a valid phone number (at least ${getMinPhoneLength(location)} digits)`);
      return;
    }

    if (!agreeToTerms) {
      setTermsError('Please agree to the Terms & Conditions to continue');
      setSignupError('Please agree to the Terms & Conditions to continue');
      return;
    }

    setIsCreatingAccount(true);

    try {
      // 1. Build the email redirect URL (after email verification)
      const redirectUrl = `${window.location.origin}/auth/callback`;

      // 2. Prepare onboarding data to store in user metadata
      const industryCode = getIndustryShortcode(state.analysis?.industry || 'other');

      // 3. Sign up with Supabase Auth (profile gets created automatically via DB trigger)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone_number: phoneNumber || '',
            business_name: state.analysis?.business_name || '',
            // Store onboarding data for provisioning after email verification
            onboarding_data: {
              business_name: state.analysis?.business_name || '',
              business_location: state.analysis?.business_location || 'US',
              industry: industryCode,
              system_prompt: state.system_prompt || '',
              channel_type: state.channel_type || 'phone',
              voice_id: state.voice_id,
              phone_number: phoneNumber || '',
              // NEW: Business context fields
              website_url: state.website_url || '',
              services_offered: state.analysis?.services || [],
              pricing_info: state.analysis?.pricing || '',
              target_audience: state.analysis?.target_audience || '',
              tone: state.analysis?.tone || 'professional',
            }
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      console.log('[Onboarding] Account created, verification email sent');

      // 4. Move to Step 6 (email verification message)
      setIsCreatingAccount(false);

      // Track account creation completion
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'onboarding_step_5_complete', {
          'channel_type': state.channel_type
        });
      }

      nextStep();

    } catch (error: any) {
      console.error('Signup error:', error);
      setSignupError(error.message || 'Failed to create account. Please try again.');
      setIsCreatingAccount(false);
    }
  };

  // Map industry text to shortcode
  const getIndustryShortcode = (industryText: string): string => {
    const industry = industryText.toLowerCase();

    // Online businesses
    if (industry.includes('saas') || industry.includes('software')) return 'saas';
    if (industry.includes('ecommerce') || industry.includes('e-commerce') || industry.includes('online store')) return 'ecom';
    if (industry.includes('blog') || industry.includes('content')) return 'blog';
    if (industry.includes('consulting') || industry.includes('consultant')) return 'cons';
    if (industry.includes('marketing') || industry.includes('agency')) return 'mark';
    if (industry.includes('design') || industry.includes('creative')) return 'desi';

    // Local services
    if (industry.includes('plumb')) return 'plmb';
    if (industry.includes('electric')) return 'elec';
    if (industry.includes('hvac')) return 'hvac';
    if (industry.includes('clean')) return 'clen';
    if (industry.includes('landscape') || industry.includes('lawn')) return 'land';
    if (industry.includes('pest')) return 'pest';
    if (industry.includes('handyman')) return 'hand';
    if (industry.includes('roof')) return 'roof';
    if (industry.includes('carpen')) return 'carp';
    if (industry.includes('restaurant') || industry.includes('food')) return 'rest';

    // Healthcare
    if (industry.includes('health') || industry.includes('medical') || industry.includes('dental')) return 'hlth';

    // Real estate
    if (industry.includes('real estate') || industry.includes('property')) return 'real';

    // Legal
    if (industry.includes('legal') || industry.includes('law')) return 'legl';

    // Default
    return 'misc';
  };

  // Handle client provisioning (Step 5)
  const handleProvisionClient = async () => {
    try {
      setProvisioningState('loading');
      setProvisioningError(null);

      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // 2. Get industry shortcode
      const industryCode = getIndustryShortcode(state.analysis?.industry || 'other');

      // 3. Call client-provisioning edge function
      console.log('[Onboarding] Calling client-provisioning...');
      const { data, error } = await supabase.functions.invoke('client-provisioning', {
        body: {
          business_name: state.analysis?.business_name || 'Business',
          region: state.analysis?.business_location || 'US',
          industry: industryCode,  // Use shortcode, not full industry name
          phone_number: phoneNumber,
          user_id: user.id,
          system_prompt: state.system_prompt || '',
          channel_type: state.channel_type || 'phone',
          voice_id: state.voice_id,  // Selected voice from Step 4
        }
      });

      if (error) {
        console.error('[Onboarding] Provisioning error:', error);
        throw new Error(error.message || 'Failed to provision client');
      }

      console.log('[Onboarding] Provisioning successful:', data);

      // 4. Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);

      // 5. Build dashboard URL
      const region = (state.analysis?.business_location || 'US').toLowerCase();
      const clientname = (state.analysis?.business_name || 'business')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

      const url = `/${region}/${industryCode}/${clientname}`;
      setDashboardUrl(url);
      setProvisioningState('success');

      // Track successful onboarding completion
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'onboarding_complete', {
          'channel_type': state.channel_type,
          'industry': industryCode,
          'voice_id': state.voice_id
        });
      }

    } catch (error: any) {
      console.error('[Onboarding] Provisioning failed:', error);
      setProvisioningError(error.message || 'Something went wrong. Please try again.');
      setProvisioningState('error');
    }
  };

  // No auto-provisioning - user clicks email verification link which triggers callback

  // Handle navigation to dashboard (Step 5)
  const handleGoToDashboard = () => {
    // Track dashboard navigation
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'go_to_dashboard_clicked', {
        'channel_type': state.channel_type,
        'dashboard_url': dashboardUrl
      });
    }

    if (dashboardUrl) {
      navigate(dashboardUrl);
    }
  };

  // Step components
  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {/* Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light mb-4">
                What would you like your new AI receptionist to do?
              </h2>
              <p className="text-[#a0a0a0]">
                Start with 30 minutes free trial • No credit card required • Test for 3 days risk-free
              </p>
            </div>

            {/* Channel Cards */}
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <ChannelCard
                icon={<i className="fas fa-comment-dots text-3xl text-white"></i>}
                title="Website Widget Only"
                price="$99"
                features={[
                  "500 minutes (~8 hours)",
                  "AI chat widget for website",
                  "Chat transcripts & analytics",
                  "Customizable branding",
                  "Only $0.15/min after that"
                ]}
                onClick={() => handleChannelSelect('website')}
                delay={0.1}
              />

              <ChannelCard
                icon={<i className="fas fa-star text-3xl text-white"></i>}
                title="Phone + Website"
                price="$179"
                badge="Recommended"
                features={[
                  "500 phone + 500 website mins (~17 hours)",
                  "Everything in Phone + Website Widget",
                  "Unified dashboard",
                  "Cross-channel analytics and syncing",
                  "Only $0.12/min after that"
                ]}
                onClick={() => handleChannelSelect('both')}
                delay={0.2}
                emphasized={true}
              />

              <ChannelCard
                icon={<i className="fas fa-phone text-3xl text-white"></i>}
                title="Phone Only"
                price="$129"
                features={[
                  "500 minutes (~8 hours)",
                  "AI phone receptionist 24/7",
                  "Call transcripts & analytics",
                  "Calendar integration",
                  "Only $0.15/min after that"
                ]}
                onClick={() => handleChannelSelect('phone')}
                delay={0.3}
              />
            </div>

            {/* Trial Details */}
            <p className="text-center text-[#a0a0a0] text-sm mt-12 font-light">
              All plans include: AI Lead Tracking • Calendar Integration • Automatic Bookings • Human Transfer • Full Transcripts • Analytics Dashboard
            </p>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4">
                Website Analysis
              </h2>
              <p className="text-[#a0a0a0]">
                We'll analyze your website to understand your business
              </p>
            </div>

            {/* Website URL Input */}
            {!isAnalyzing && (
              <form onSubmit={(e) => { e.preventDefault(); if (websiteUrl) handleAnalyzeWebsite(); }} noValidate className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What's your website URL?
                  </label>
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="text-lg h-14"
                    autoFocus
                  />
                </div>

                <ModernButton
                  type="submit"
                  disabled={!websiteUrl}
                  className="w-full h-14 text-lg"
                >
                  Analyze Website →
                </ModernButton>

                <div className="text-center">
                  <button
                    onClick={() => {
                      // Track skip action
                      if (typeof window !== 'undefined' && (window as any).gtag) {
                        (window as any).gtag('event', 'onboarding_step_1_skipped');
                      }

                      // Skip to manual entry (Step 3 with empty fields)
                      nextStep();
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Skip and enter details manually →
                  </button>
                </div>
              </form>
            )}

            {/* Loading Animation */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
                <motion.p
                  key={currentLoadingMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-2xl font-light"
                >
                  {currentLoadingMessage}
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4">
                {state.analysis ? 'Review Your Details' : 'Tell Us About Your Business'}
              </h2>
              <p className="text-[#a0a0a0]">
                {state.analysis
                  ? 'We\'ve analyzed your website. Make any edits if needed.'
                  : 'Fill in your business details to create your AI receptionist.'}
              </p>
            </div>

            <div className="space-y-6">
              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name *</label>
                <Input
                  value={state.analysis?.business_name || ''}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, business_name: e.target.value }
                  })}
                  placeholder="e.g., Klariqo"
                  className={`text-lg h-12 ${!state.analysis?.business_name ? 'border-red-500/50' : ''}`}
                />
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Industry *</label>
                <Input
                  value={state.analysis?.industry || ''}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, industry: e.target.value }
                  })}
                  placeholder="e.g., SaaS, E-commerce, Healthcare, Restaurant"
                  className={`text-lg h-12 ${!state.analysis?.industry ? 'border-red-500/50' : ''}`}
                />
              </div>

              {/* Business Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Where is your business located? *</label>
                <select
                  value={state.analysis?.business_location || ''}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, business_location: e.target.value }
                  })}
                  className={`w-full h-12 text-sm leading-5 bg-background border rounded-md px-3 ${
                    !state.analysis?.business_location ? 'border-red-500/50' : 'border-white/8'
                  }`}
                >
                  <option value="">Select location...</option>
                  <option value="AU">Australia</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  This helps us select the right voice accent for your AI receptionist
                </p>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Main Services / Products *</label>
                <Textarea
                  value={state.analysis?.services?.join('\n') || ''}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, services: e.target.value.split('\n').filter(s => s.trim()) }
                  })}
                  placeholder="One service per line, e.g.:&#10;AI Phone Receptionist&#10;Website Chat Widget&#10;24/7 Customer Support"
                  className={`text-sm leading-5 min-h-[120px] ${!state.analysis?.services || state.analysis?.services.length === 0 ? 'border-red-500/50' : ''}`}
                />
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pricing (optional)</label>
                <Input
                  value={state.analysis?.pricing || ''}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, pricing: e.target.value }
                  })}
                  placeholder="e.g., From $39/month, Custom pricing, Contact for quote"
                  className="text-lg h-12"
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience (optional)</label>
                <Input
                  value={state.analysis?.target_audience || ''}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, target_audience: e.target.value }
                  })}
                  placeholder="e.g., Small businesses, SaaS founders, Local restaurants"
                  className="text-lg h-12"
                />
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Tone *</label>
                <select
                  value={state.analysis?.tone || 'professional'}
                  onChange={(e) => updateState({
                    analysis: { ...state.analysis, tone: e.target.value }
                  })}
                  onFocus={(e) => {
                    // Set default value if not already set
                    if (!state.analysis?.tone) {
                      updateState({
                        analysis: { ...state.analysis, tone: 'professional' }
                      });
                    }
                  }}
                  className="w-full h-12 text-sm leading-5 bg-background border border-white/8 rounded-md px-3"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                </select>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">AI Instructions (System Prompt)</label>
                  <ModernButton
                    onClick={generatePromptFromManualData}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    🔄 Generate Instructions
                  </ModernButton>
                </div>
                <Textarea
                  value={state.system_prompt || ''}
                  onChange={(e) => updateState({ system_prompt: e.target.value })}
                  placeholder="Click 'Generate Instructions' to auto-create based on your details above, or write custom instructions..."
                  className="text-sm leading-5 min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  This tells your AI how to behave when talking to customers. Click "Generate Instructions" after filling in the fields above.
                </p>
              </div>

              {/* Next Button */}
              <ModernButton
                onClick={() => {
                  // Track business details completion
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'onboarding_step_3_complete', {
                      'industry': state.analysis?.industry
                    });
                  }
                  nextStep();
                }}
                disabled={
                  !state.analysis?.business_name ||
                  !state.analysis?.industry ||
                  !state.analysis?.business_location ||
                  !state.analysis?.services ||
                  state.analysis?.services.length === 0 ||
                  !state.analysis?.tone
                }
                className="w-full h-14 text-lg"
              >
                Continue to Account Setup →
              </ModernButton>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4">
                Choose Your AI Voice
              </h2>
              <p className="text-[#a0a0a0]">
                Select the voice that will represent your business
              </p>
            </div>

            {/* Voice Grid */}
            {loadingVoices ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {voices.map((voice) => (
                  <div
                    key={voice.voice_id}
                    onClick={() => updateState({ voice_id: voice.voice_id })}
                    className={`relative rounded-2xl border-2 p-6 text-left transition-all hover:scale-105 cursor-pointer ${
                      state.voice_id === voice.voice_id
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Avatar Image */}
                    <div className="w-20 h-20 rounded-full mb-4 mx-auto overflow-hidden border-2 border-white/10">
                      {voice.avatar_url ? (
                        <img
                          src={voice.avatar_url}
                          alt={voice.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-3xl font-light">
                          {voice.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Voice Info */}
                    <div className="text-center mb-3">
                      <h3 className="text-xl font-medium mb-1">{voice.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {voice.gender === 'male' ? 'Male' : 'Female'} • {voice.accent === 'AU' ? 'Australian' : voice.accent === 'US' ? 'American' : 'British'}
                      </p>
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoiceDemo(voice.voice_id, voice.demo_audio_url);
                      }}
                      className="w-full py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      {playingVoice === voice.voice_id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary animate-pulse rounded-sm" />
                          <span className="text-sm">Playing...</span>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 border-2 border-primary rounded-sm flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[6px] border-l-primary border-y-[4px] border-y-transparent ml-0.5" />
                          </div>
                          <span className="text-sm">Preview</span>
                        </>
                      )}
                    </button>

                    {/* Selected Badge */}
                    {state.voice_id === voice.voice_id && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Coming Soon Card */}
                <div className="relative rounded-2xl border-2 border-dashed border-white/10 p-6 flex flex-col items-center justify-center text-center opacity-50">
                  <Sparkles className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">More Voices</h3>
                  <p className="text-sm text-muted-foreground">Coming Soon</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <ModernButton
                variant="outline"
                size="lg"
                onClick={() => goToStep(3)}
              >
                ← Back
              </ModernButton>
              <ModernButton
                variant="gradient"
                size="lg"
                onClick={() => {
                  // Track voice selection completion
                  if (typeof window !== 'undefined' && (window as any).gtag) {
                    (window as any).gtag('event', 'onboarding_step_4_complete', {
                      'voice_id': state.voice_id
                    });
                  }
                  nextStep();
                }}
                disabled={!state.voice_id}
              >
                Continue →
              </ModernButton>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light mb-4">
                Create Your Account
              </h2>
              <p className="text-[#a0a0a0]">
                Almost there! Just a few more details to get started.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!isCreatingAccount && fullName && email && password && agreeToTerms && validateEmail(email)) {
                handleCreateAccount();
              }
            }} noValidate className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="text-lg h-12"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="john@example.com"
                  className={`text-lg h-12 ${emailError ? 'border-red-500' : ''}`}
                />
                {emailError && (
                  <p className="text-xs text-red-500">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Password *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="text-lg h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && password.length < 8 && (
                  <p className="text-xs text-red-500">Password must be at least 8 characters</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  value={phoneNumber || getCountryCodePrefix(state.analysis?.business_location || 'US')}
                  onChange={(e) => {
                    const location = state.analysis?.business_location || 'US';
                    const formatted = formatPhoneInput(e.target.value, location);
                    setPhoneNumber(formatted);
                  }}
                  onFocus={(e) => {
                    // Set country code prefix if empty
                    if (!phoneNumber) {
                      setPhoneNumber(getCountryCodePrefix(state.analysis?.business_location || 'US'));
                    }
                  }}
                  placeholder={
                    state.analysis?.business_location === 'US' || state.analysis?.business_location === 'CA'
                      ? '+1 (555) 123-4567'
                      : state.analysis?.business_location === 'IN'
                      ? '+91 12345-67890'
                      : getCountryCodePrefix(state.analysis?.business_location || 'US') + '1234567890'
                  }
                  className="text-lg h-12"
                />
                <p className="text-xs text-muted-foreground">
                  {state.analysis?.business_location === 'US' || state.analysis?.business_location === 'CA'
                    ? 'Format: (xxx) xxx-xxxx (max 10 digits)'
                    : state.analysis?.business_location === 'IN'
                    ? 'Format: xxxxx-xxxxx (max 10 digits)'
                    : `Max ${getPhoneLength(state.analysis?.business_location || 'US').max} digits`}
                </p>
              </div>

              {/* Terms & Conditions */}
              <div className={`flex items-start gap-3 p-4 bg-white/[0.02] border rounded-lg ${termsError ? 'border-red-500/50' : 'border-white/8'}`}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => {
                    setAgreeToTerms(e.target.checked);
                    setTermsError(null);
                  }}
                  className="mt-1 w-4 h-4 rounded border-white/8"
                />
                <div>
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="text-primary hover:underline">
                      Terms & Conditions
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                  {termsError && (
                    <p className="text-xs text-red-500 mt-1">{termsError}</p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {signupError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-500">{signupError}</p>
                </div>
              )}

              {/* Create Account Button */}
              <ModernButton
                type="submit"
                disabled={
                  isCreatingAccount ||
                  !fullName ||
                  !email ||
                  !password ||
                  !agreeToTerms ||
                  !validateEmail(email) ||
                  (phoneNumber && phoneNumber.trim() !== '' && !isPhoneValid(phoneNumber, state.analysis?.business_location || 'US'))
                }
                className="w-full h-14 text-lg"
              >
                {isCreatingAccount ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Continue →'
                )}
              </ModernButton>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <a href="/login" className="text-primary hover:underline">
                    Sign in
                  </a>
                </p>
              </div>
            </form>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl mx-auto"
          >
            {/* EMAIL VERIFICATION MESSAGE */}
            <div className="text-center space-y-8">
              {/* Email Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <Mail className="w-12 h-12 text-primary" />
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h1 className="text-5xl md:text-7xl font-thin leading-tight">
                  Almost there!
                  <br />
                  Check your email
                </h1>
                <p className="text-xl md:text-2xl text-[#a0a0a0] max-w-2xl mx-auto font-light">
                  We've sent a verification link to <span className="font-medium text-white">{email}</span>
                </p>
                <p className="text-lg text-[#a0a0a0] max-w-xl mx-auto font-light">
                  Click the link in the email to verify your account and access your AI receptionist dashboard.
                </p>
              </motion.div>

              {/* Helpful Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-md mx-auto space-y-4 pt-8"
              >
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-left">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Tip:</span> Check your spam folder if you don't see the email within a few minutes.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can close this page. The verification link will take you directly to your dashboard.
                </p>
              </motion.div>
            </div>

            {/* LEGACY ERROR STATE (kept just in case) */}
            {provisioningState === 'error' && (
              <div className="text-center space-y-8">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                    <span className="text-5xl">⚠️</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-4xl font-light">
                    Setup encountered an issue
                  </h2>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-w-xl mx-auto">
                    <p className="text-sm text-red-500">
                      {provisioningError}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <ModernButton onClick={handleProvisionClient} className="h-12 px-8">
                    Try Again
                  </ModernButton>
                  <ModernButton
                    variant="outline"
                    onClick={() => window.location.href = 'mailto:hello@klariqo.com'}
                    className="h-12 px-8"
                  >
                    Contact Support
                  </ModernButton>
                </div>

                <p className="text-xs text-muted-foreground">
                  Most issues resolve with a quick retry. If not, we'll fix it within 24 hours!
                </p>
              </div>
            )}

            {/* SUCCESS STATE */}
            {provisioningState === 'success' && (
              <div className="text-center space-y-8">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                    <Sparkles className="w-12 h-12 text-primary" />
                  </div>
                </motion.div>

                {/* Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <h1 className="text-5xl md:text-7xl font-thin leading-tight">
                    Setup complete!
                    <br />
                    You're officially unstoppable
                  </h1>
                  <p className="text-xl md:text-2xl text-[#a0a0a0] max-w-2xl mx-auto font-light">
                    Your AI receptionist is ready. Head to your dashboard to see the magic happen.
                  </p>
                </motion.div>

                {/* Dashboard Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <ModernButton
                    onClick={handleGoToDashboard}
                    className="h-14 px-12 text-lg"
                  >
                    Go to Dashboard →
                  </ModernButton>
                </motion.div>

                {/* Email Verification Reminder */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="pt-8"
                >
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-xl mx-auto">
                    <p className="text-sm">
                      <strong>Check your email</strong> - We've sent a verification link to <strong>{email}</strong>
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-manrope relative">
      {/* Background pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header - Logo only (no background) */}
      <header className="py-6 relative z-50">
        <div className="flex justify-center">
          <img
            src="/assets/images/klariqo-white.svg"
            alt="Klariqo"
            className="h-8 md:h-10"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto w-full">
          {/* Progress Steps */}
          <div className="mb-12">
            <ProgressSteps
              currentStep={state.currentStep}
              totalSteps={6}
              labels={['Channel', 'Analysis', 'Review', 'Voice', 'Account', 'Complete']}
              onStepClick={goToStep}
            />
          </div>

          {/* Step Content with AnimatePresence for smooth transitions */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
