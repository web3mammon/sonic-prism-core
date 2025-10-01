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
  const [serviceFee, setServiceFee] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // First, update the user's profile with business information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          business_type: businessType,
          service_fee: parseFloat(serviceFee),
          onboarding_completed: true
        } as any) // Using 'as any' until types are regenerated
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Create normalized client_slug from business name
      const clientSlug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '') // Remove spaces
        .substring(0, 20); // Limit length

      // Map business type to industry code
      const industryMap: { [key: string]: string } = {
        'plumbing': 'plmb',
        'electrical': 'elec',
        'hvac': 'hvac',
        'cleaning': 'clean',
        'landscaping': 'land',
        'pest-control': 'pest',
        'handyman': 'hand',
        'roofing': 'roof',
        'carpentry': 'carp',
        'other': 'misc'
      };

      const industry = industryMap[businessType] || 'misc';
      const region = 'au'; // Default to Australia for now
      const clientId = `${region}_${industry}_${clientSlug}`;

      // Create voice_ai_clients record (database triggers will auto-assign port and api_proxy_path)
      const { error: clientError } = await supabase
        .from('voice_ai_clients')
        .insert({
          client_id: clientId,
          user_id: user.id,
          business_name: businessName,
          region: region,
          industry: industry,
          client_slug: clientSlug,
          status: 'active',
          config: {
            business_type: businessType,
            service_fee: parseFloat(serviceFee),
            features: {
              voice_calls: true,
              sms: true,
              call_recording: true,
              analytics: true
            }
          }
        });

      if (clientError) throw clientError;

      // Hide form loading and show beautiful provisioning overlay
      setIsLoading(false);
      setShowProvisioningOverlay(true);

      // Trigger client provisioning automation
      try {
        const { data: provisioningData, error: provisioningError } = await supabase.functions.invoke(
          'client-provisioning',
          {
            body: {
              client_id: clientId,
              business_name: businessName,
              region: region,
              industry: industry,
              client_slug: clientSlug
            }
          }
        );

        if (provisioningError) {
          console.error('Provisioning error:', provisioningError);
          setShowProvisioningOverlay(false);
          toast({
            title: "Provisioning Warning",
            description: "Your account was created but provisioning may take longer. You can still access your dashboard.",
            variant: "destructive",
          });
        } else {
          // Success! Auto-redirect after a brief moment
          setTimeout(() => {
            setShowProvisioningOverlay(false);
            toast({
              title: "Welcome to Klariqo!",
              description: "Your AI voice agent is ready to take calls!",
            });
            onComplete({ region, industry, clientSlug });
          }, 2000);
        }
      } catch (provisioningError) {
        console.error('Failed to trigger provisioning:', provisioningError);
        setShowProvisioningOverlay(false);
        toast({
          title: "Provisioning Warning",
          description: "Your account was created but automated setup may take longer. You can still access your dashboard.",
          variant: "destructive",
        });
        onComplete({ region, industry, clientSlug });
      }

    } catch (error) {
      console.error('Error setting up business:', error);
      setShowProvisioningOverlay(false);
      toast({
        title: "Error",
        description: "Failed to save business information. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
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
              <Label htmlFor="serviceFee">Service Call Fee ($)</Label>
              <Input
                id="serviceFee"
                type="number"
                value={serviceFee}
                onChange={(e) => setServiceFee(e.target.value)}
                placeholder="e.g. 89"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Setting up..." : "Complete Setup"}
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