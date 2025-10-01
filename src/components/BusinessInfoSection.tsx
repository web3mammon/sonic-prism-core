import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Clock, Phone, DollarSign, Edit, Save, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function BusinessInfoSection() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const extendedProfile = profile as any;

  // Form state
  const [formData, setFormData] = useState({
    business_hours: extendedProfile?.business_hours || '',
    business_address: extendedProfile?.business_address || '',
    services_offered: extendedProfile?.services_offered || '',
    service_area: extendedProfile?.service_area || '',
    emergency_fee: extendedProfile?.emergency_fee || '',
  });

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Business information updated",
        description: "Your details have been saved successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating business info:', error);
      toast({
        title: "Error",
        description: "Failed to update business information.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      business_hours: extendedProfile?.business_hours || '',
      business_address: extendedProfile?.business_address || '',
      services_offered: extendedProfile?.services_offered || '',
      service_area: extendedProfile?.service_area || '',
      emergency_fee: extendedProfile?.emergency_fee || '',
    });
    setIsEditing(false);
  };

  const getCompletionPercentage = () => {
    const fields = [
      extendedProfile?.business_name,
      extendedProfile?.business_type,
      formData.business_hours,
      formData.business_address,
      formData.services_offered,
      extendedProfile?.service_fee,
    ];
    
    const completed = fields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  return (
    <Card className="font-manrope">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">Business Information</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className="text-sm text-muted-foreground">
              Profile completion: {getCompletionPercentage()}%
            </div>
            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>
        </div>
        
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Info (Read-only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Business Name
            </Label>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">{extendedProfile?.business_name || 'Not set'}</div>
              <Badge variant="secondary" className="text-xs">Cannot be changed</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Business Type
            </Label>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium capitalize">
                {extendedProfile?.business_type?.replace('-', ' ') || 'Not set'}
              </div>
              <Badge variant="secondary" className="text-xs">Cannot be changed</Badge>
            </div>
          </div>
        </div>

        {/* Service Fee (Read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Service Call Fee
          </Label>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">
              ${extendedProfile?.service_fee || 'Not set'}
            </div>
            <Badge variant="secondary" className="text-xs">Cannot be changed</Badge>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Business Hours
            </Label>
            {isEditing ? (
              <Input
                value={formData.business_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, business_hours: e.target.value }))}
                placeholder="e.g., Mon-Fri: 8AM-6PM, Sat: 9AM-4PM, Sun: Closed"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {formData.business_hours || 'Not set - Click edit to add your business hours'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Business Address
            </Label>
            {isEditing ? (
              <Textarea
                value={formData.business_address}
                onChange={(e) => setFormData(prev => ({ ...prev, business_address: e.target.value }))}
                placeholder="Enter your full business address"
                className="min-h-[60px]"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {formData.business_address || 'Not set - Click edit to add your business address'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Services Offered</Label>
            {isEditing ? (
              <Textarea
                value={formData.services_offered}
                onChange={(e) => setFormData(prev => ({ ...prev, services_offered: e.target.value }))}
                placeholder="List the main services you offer (e.g., Emergency repairs, Installation, Maintenance)"
                className="min-h-[80px]"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {formData.services_offered || 'Not set - Click edit to add your services'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Service Area
            </Label>
            {isEditing ? (
              <Input
                value={formData.service_area}
                onChange={(e) => setFormData(prev => ({ ...prev, service_area: e.target.value }))}
                placeholder="e.g., Sydney CBD, Inner West, North Shore"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {formData.service_area || 'Not set - Click edit to add your service area'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Emergency Call Fee
            </Label>
            {isEditing ? (
              <Input
                type="number"
                value={formData.emergency_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_fee: e.target.value }))}
                placeholder="Emergency service fee (optional)"
                min="0"
                step="0.01"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {formData.emergency_fee ? `$${formData.emergency_fee}` : 'Not set - Click edit to add emergency fee'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}