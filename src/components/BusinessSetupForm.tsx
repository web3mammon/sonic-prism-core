import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/profiles';
import { ProvisioningOverlay } from '@/components/ProvisioningOverlay';

interface BusinessSetupFormProps {
  onComplete: (clientInfo?: { region: string; industry: string; clientSlug: string }) => void;
}

const businessTypes = [
  { value: 'plumbing', label: 'Plumbing Services' },
  { value: 'electrical', label: 'Electrical Services' },
  { value: 'hvac', label: 'HVAC Services' },
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'landscaping', label: 'Landscaping Services' },
  { value: 'pest-control', label: 'Pest Control' },
  { value: 'handyman', label: 'Handyman Services' },
  { value: 'roofing', label: 'Roofing Services' },
  { value: 'carpentry', label: 'Carpentry Services' },
  { value: 'other', label: 'Other' }
];

export function BusinessSetupForm({ onComplete }: BusinessSetupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showProvisioningOverlay, setShowProvisioningOverlay] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [region, setRegion] = useState('AU');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setShowProvisioningOverlay(true);

    try {
      // Map business type to industry code
      const industryMap: { [key: string]: string } = {
        'plumbing': 'plmb',
        'electrical': 'elec',
        'hvac': 'hvac',
        'cleaning': 'clen',
        'landscaping': 'land',
        'pest-control': 'pest',
        'handyman': 'hand',
        'roofing': 'roof',
        'carpentry': 'carp',
        'other': 'misc'
      };

      const industry = industryMap[businessType] || 'misc';

      // Get region-specific voice ID
      const voiceIdMap: { [key: string]: string } = {
        'AU': 'G83AhxHK8kccx46W4Tcd', // Male Australian voice
        'US': 'pNInz6obpgDQGcFmaJgB', // Male US voice (Adam)
        'UK': 'ThT5KcBeYPX3keUQqHPh', // Male UK voice (Antoni)
      };
      const voice_id = voiceIdMap[region] || voiceIdMap['AU'];

      console.log('[BusinessSetup] Calling client-provisioning edge function...');

      // Call NEW client-provisioning edge function - it handles EVERYTHING!
      const { data: provisioningData, error: provisioningError } = await supabase.functions.invoke(
        'client-provisioning',
        {
          body: {
            business_name: businessName,
            region: region,
            industry: businessType, // Pass full industry name
            phone_number: phoneNumber,
            user_id: user.id,
            voice_id: voice_id,
          }
        }
      );

      if (provisioningError) {
        console.error('Provisioning error:', provisioningError);
        throw new Error(provisioningError.message || 'Failed to provision client');
      }

      console.log('[BusinessSetup] Provisioning successful:', provisioningData);

      // Extract client_slug from response for redirect
      // Format: au_plmb_businessname_001 -> need to get "businessname" part
      const clientSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);

      // Update profile with onboarding completed
      await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          business_type: businessType,
          onboarding_completed: true
        } as any)
        .eq('user_id', user.id);

      // Success! Show success message and redirect
      setTimeout(() => {
        setShowProvisioningOverlay(false);
        toast({
          title: "Welcome to Klariqo!",
          description: "Your AI voice agent is ready to take calls!",
        });
        onComplete({ region: region.toLowerCase(), industry, clientSlug });
      }, 2000);

    } catch (error) {
      console.error('Error setting up business:', error);
      setShowProvisioningOverlay(false);
      setIsLoading(false);
      toast({
        title: "Setup Error",
        description: error instanceof Error ? error.message : "Failed to set up your business. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-manrope">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Complete Your Setup</CardTitle>
          <p className="text-muted-foreground">Just a few details to get your AI agent ready</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border">
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your region" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border">
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+61400000000"
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be your AI assistant's phone number
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Setting up your AI agent..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Provisioning Overlay */}
      <ProvisioningOverlay
        isVisible={showProvisioningOverlay}
        businessName={businessName}
      />
    </div>
  );
}