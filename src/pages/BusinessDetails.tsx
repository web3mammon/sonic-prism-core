import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui/modern-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  Clock,
  Phone,
  Mail,
  Save,
  Edit3,
  CheckCircle,
  PhoneForwarded,
  Loader2,
  Globe,
  DollarSign
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
    websiteUrl: "",
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
        websiteUrl: (profile as any)?.website_url || "",
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
          website_url: formData.websiteUrl || null,
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
      websiteUrl: (profile as any)?.website_url || "",
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
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
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
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight mb-2">Business Details</h1>
          <p className="text-muted-foreground">
            Manage your business information and service details
          </p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <ModernButton onClick={handleEdit} size="sm">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Details
            </ModernButton>
          ) : (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCancel} size="sm" disabled={isSaving} className="border-white/10 hover:bg-white/[0.02]">
                Cancel
              </Button>
              <ModernButton onClick={handleSave} size="sm" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </ModernButton>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">Basic Information</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Core business details and contact information
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              {isEditing ? (
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
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
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
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
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
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
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
                  {formData.phoneNumber || "Not specified"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Website URL <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              {isEditing ? (
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                  placeholder="https://example.com"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
                  {formData.websiteUrl || "Not specified"}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Location & Service Area */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">Location & Service Area</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Business address and areas you serve
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              {isEditing ? (
                <Textarea
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                  rows={3}
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm min-h-[80px]">
                  {formData.businessAddress || "Not specified"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceArea">Service Area <span className="text-muted-foreground font-normal">(Optional - if applicable)</span></Label>
              {isEditing ? (
                <Textarea
                  id="serviceArea"
                  value={formData.serviceArea}
                  onChange={(e) => handleInputChange("serviceArea", e.target.value)}
                  rows={3}
                  placeholder="Areas, suburbs, or regions you provide services to"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm min-h-[80px]">
                  {formData.serviceArea || "Not specified"}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Business Hours */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">Operating Hours</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              When your business is available for service
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessHours">Business Hours <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              {isEditing ? (
                <Textarea
                  id="businessHours"
                  value={formData.businessHours}
                  onChange={(e) => handleInputChange("businessHours", e.target.value)}
                  rows={4}
                  placeholder="e.g. Mon-Fri: 8:00 AM - 6:00 PM, Sat: 9:00 AM - 4:00 PM, Sun: Closed"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm min-h-[100px]">
                  {formData.businessHours || "Not specified"}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Services & Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-extralight">Services & Pricing</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Services offered and pricing information
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="servicesOffered">Services Offered <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              {isEditing ? (
                <Textarea
                  id="servicesOffered"
                  value={formData.servicesOffered}
                  onChange={(e) => handleInputChange("servicesOffered", e.target.value)}
                  rows={3}
                  placeholder="List the services your business provides"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm min-h-[80px]">
                  {formData.servicesOffered || "Not specified"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceFee" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Regular Service Fee <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="serviceFee"
                    type="number"
                    value={formData.serviceFee}
                    onChange={(e) => handleInputChange("serviceFee", e.target.value)}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
                    {formData.serviceFee ? `$${formData.serviceFee}` : "Not specified"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyFee" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Emergency Fee <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                {isEditing ? (
                  <Input
                    id="emergencyFee"
                    type="number"
                    value={formData.emergencyFee}
                    onChange={(e) => handleInputChange("emergencyFee", e.target.value)}
                    placeholder="0.00"
                  />
                ) : (
                  <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
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
                    Call Transfer Number <span className="text-muted-foreground font-normal">(Optional)</span>
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
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
                  {formData.callTransferNumber || "Not configured - transfers disabled"}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}