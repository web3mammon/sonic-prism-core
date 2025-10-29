import React, { createContext, useContext, useState, useEffect } from 'react';

export type ChannelType = 'website' | 'phone' | 'both';

interface OnboardingState {
  // Step 1: Channel Selection
  channel_type?: ChannelType;

  // Step 2: Website Analysis
  website_url?: string;
  analysis?: {
    business_name: string;
    industry: string;
    business_location?: string;
    services: string[];
    tone: string;
    target_audience: string;
    usps?: string[];
    pricing?: string;
  };

  // Step 3: System Prompt
  system_prompt?: string;

  // Step 4: Voice (only if phone/both)
  voice_id?: string;

  // Tracking
  currentStep: number;
}

interface OnboardingContextType {
  state: OnboardingState;
  updateState: (updates: Partial<OnboardingState>) => void;
  clearState: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialState: OnboardingState = {
  currentStep: 1,
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  // Simple state, no localStorage
  const [state, setState] = useState<OnboardingState>(initialState);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const clearState = () => {
    setState(initialState);
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
  };

  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  return (
    <OnboardingContext.Provider value={{ state, updateState, clearState, nextStep, prevStep, goToStep }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
