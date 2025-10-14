import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Building2, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Save,
  Edit3,
  CheckCircle,
  PhoneForwarded
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BusinessDetails() {
  const { profile } = useAuth();
  const { client, loading, error } = useCurrentClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Form state - initialize empty, populate when data loads
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    phoneNumber: "",
    email: "",
    businessAddress: "",
    serviceArea: "",
    businessHours: "",
    servicesOffered: "",
    emergencyFee: "",
    serviceFee: "",
    callTransferNumber: ""
  });

  // Initialize form data when profile and client data are available
  useEffect(() => {
    if (!loading && (profile || client) && !dataLoaded) {
      setFormData({
        businessName: profile?.business_name || client?.business_name || "",
        businessType: (profile as any)?.business_type || client?.industry || "",
        phoneNumber: (profile as any)?.phone_number || client?.phone_number || "",
        email: profile?.email || "",
        businessAddress: (profile as any)?.business_address || "",
        serviceArea: (profile as any)?.service_area || "",
        businessHours: (profile as any)?.business_hours || "",
        servicesOffered: (profile as any)?.services_offered || "",
        emergencyFee: (profile as any)?.emergency_fee || "",
        serviceFee: (profile as any)?.service_fee || "",
        callTransferNumber: client?.call_transfer_number || ""
      });
      setDataLoaded(true);
    }
  }, [loading, profile, client, dataLoaded]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile?.id) {
      toast.error("User not found");
      return;
    }

    setIsSaving(true);
    try {
      // Update user profile with business details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          business_name: formData.businessName,
          business_type: formData.businessType,
          phone_number: formData.phoneNumber,
          business_address: formData.businessAddress,
          service_area: formData.serviceArea,
          business_hours: formData.businessHours,
          services_offered: formData.servicesOffered,
          emergency_fee: formData.emergencyFee ? parseFloat(formData.emergencyFee) : null,
          service_fee: formData.serviceFee ? parseFloat(formData.serviceFee) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (profileError) {
        throw profileError;
      }

      // Update voice_ai_clients with transfer number if client exists
      if (client) {
        const { error: clientError } = await supabase
          .from('voice_ai_clients')
          .update({
            call_transfer_number: formData.callTransferNumber || null,
            call_transfer_enabled: !!formData.callTransferNumber,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', client.client_id);

        if (clientError) {
          throw clientError;
        }
      }

      toast.success("Business details saved successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving business details:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      businessName: profile?.business_name || client?.business_name || "",
      businessType: (profile as any)?.business_type || client?.industry || "",
      phoneNumber: (profile as any)?.phone_number || client?.phone_number || "",
      email: profile?.email || "",
      businessAddress: (profile as any)?.business_address || "",
      serviceArea: (profile as any)?.service_area || "",
      businessHours: (profile as any)?.business_hours || "",
      servicesOffered: (profile as any)?.services_offered || "",
      emergencyFee: (profile as any)?.emergency_fee || "",
      serviceFee: (profile as any)?.service_fee || "",
      callTransferNumber: client?.call_transfer_number || ""
    });
    setIsEditing(false);
  };

  if (loading || !dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading business details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading business details</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-manrope">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Details</h1>
          <p className="text-muted-foreground">
            Manage your business information and service details
          </p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <Button onClick={handleEdit} size="sm">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" onClick={handleCancel} size="sm" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Client Status Badge */}
      {client && (
        <div className="flex items-center gap-2">
          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
            {client.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Voice AI Client: {client.client_id}
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Core business details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              {isEditing ? (
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {formData.businessName || "Not specified"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type / Industry</Label>
              {isEditing ? (
                <Input
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => handleInputChange("businessType", e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {formData.businessType || "Not specified"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {formData.email || "Not specified"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              {isEditing ? (
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {formData.phoneNumber || "Not specified"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location & Service Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Service Area
            </CardTitle>
            <CardDescription>
              Business address and areas you serve
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              {isEditing ? (
                <Textarea
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                  rows={3}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm min-h-[80px]">
                  {formData.businessAddress || "Not specified"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceArea">Service Area</Label>
              {isEditing ? (
                <Textarea
                  id="serviceArea"
                  value={formData.serviceArea}
                  onChange={(e) => handleInputChange("serviceArea", e.target.value)}
                  rows={3}
                  placeholder="Areas, suburbs, or regions you provide services to"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm min-h-[80px]">
                  {formData.serviceArea || "Not specified"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Operating Hours
            </CardTitle>
            <CardDescription>
              When your business is available for service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessHours">Business Hours</Label>
              {isEditing ? (
                <Textarea
                  id="businessHours"
                  value={formData.businessHours}
                  onChange={(e) => handleInputChange("businessHours", e.target.value)}
                  rows={4}
                  placeholder="e.g. Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 4:00 PM, Sun: Closed"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm min-h-[100px]">
                  {formData.businessHours || "Not specified"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Services & Pricing
            </CardTitle>
            <CardDescription>
              Services offered and pricing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="servicesOffered">Services Offered</Label>
              {isEditing ? (
                <Textarea
                  id="servicesOffered"
                  value={formData.servicesOffered}
                  onChange={(e) => handleInputChange("servicesOffered", e.target.value)}
                  rows={3}
                  placeholder="List the services your business provides"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm min-h-[80px]">
                  {formData.servicesOffered || "Not specified"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceFee">Regular Service Fee</Label>
                {isEditing ? (
                  <Input
                    id="serviceFee"
                    type="number"
                    value={formData.serviceFee}
                    onChange={(e) => handleInputChange("serviceFee", e.target.value)}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {formData.serviceFee ? `$${formData.serviceFee}` : "Not specified"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyFee">Emergency Fee</Label>
                {isEditing ? (
                  <Input
                    id="emergencyFee"
                    type="number"
                    value={formData.emergencyFee}
                    onChange={(e) => handleInputChange("emergencyFee", e.target.value)}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {formData.emergencyFee ? `$${formData.emergencyFee}` : "Not specified"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <TooltipProvider>
                <div className="flex items-center gap-2">
                  <Label htmlFor="callTransferNumber" className="flex items-center gap-1">
                    <PhoneForwarded className="h-4 w-4" />
                    Transfer to Number
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/50 flex items-center justify-center text-xs text-muted-foreground cursor-help">
                        ?
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>When customers request to speak with a human agent, the AI will transfer calls to this number. Leave empty to disable call transfers.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              {isEditing ? (
                <Input
                  id="callTransferNumber"
                  type="tel"
                  value={formData.callTransferNumber}
                  onChange={(e) => handleInputChange("callTransferNumber", e.target.value)}
                  placeholder="+61412345678"
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {formData.callTransferNumber || "Not configured - transfers disabled"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}