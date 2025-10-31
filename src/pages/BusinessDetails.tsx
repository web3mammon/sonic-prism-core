import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui/modern-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BusinessHoursEditor, BusinessHours } from "@/components/BusinessHoursEditor";
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
    // Voice AI Client fields
    websiteUrl: "",
    businessAddress: "",
    servicesOffered: [] as string[],
    pricingInfo: "",
    targetAudience: "",
    tone: "professional",
    callTransferNumber: ""
  });

  // Business hours and timezone state (stored in voice_ai_clients table)
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [timezone, setTimezone] = useState<string>('America/New_York');

  // Initialize form data when client data is available
  useEffect(() => {
    if (!loading && client) {
      console.log('[BusinessDetails] Loading client data:', {
        website_url: (client as any)?.website_url,
        business_address: (client as any)?.business_address
      });

      setFormData({
        websiteUrl: (client as any)?.website_url || "",
        businessAddress: (client as any)?.business_address || "",
        servicesOffered: (client as any)?.services_offered || [],
        pricingInfo: (client as any)?.pricing_info || "",
        targetAudience: (client as any)?.target_audience || "",
        tone: (client as any)?.tone || "professional",
        callTransferNumber: client?.call_transfer_number || ""
      });

      // Load business hours and timezone from voice_ai_clients table
      if (client?.business_hours) {
        setBusinessHours(client.business_hours);
      }
      if (client?.timezone) {
        setTimezone(client.timezone);
      }

      setDataLoaded(true);
    }
  }, [loading, client]); // FIXED: Removed dataLoaded from dependencies

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!client) {
      toast.error("Client not found");
      return;
    }

    setIsSaving(true);
    try {
      // Update voice_ai_clients table with ALL business details
      const { error: clientError } = await supabase
        .from('voice_ai_clients')
        .update({
          website_url: formData.websiteUrl || null,
          business_address: formData.businessAddress || null,
          services_offered: formData.servicesOffered,
          pricing_info: formData.pricingInfo || null,
          target_audience: formData.targetAudience || null,
          tone: formData.tone,
          call_transfer_number: formData.callTransferNumber || null,
          call_transfer_enabled: !!formData.callTransferNumber,
          business_hours: businessHours,
          timezone: timezone,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', client.client_id);

      if (clientError) {
        throw clientError;
      }

      toast.success("Business details saved successfully!");
      setIsEditing(false);
    } catch (error: any) {
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

    // Reset business hours and timezone
    if (client?.business_hours) {
      setBusinessHours(client.business_hours);
    } else {
      setBusinessHours({});
    }
    if (client?.timezone) {
      setTimezone(client.timezone);
    } else {
      setTimezone('America/New_York');
    }

    setIsEditing(false);
  };

  const handleBusinessHoursChange = (hours: BusinessHours, tz: string) => {
    setBusinessHours(hours);
    setTimezone(tz);
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
            {/* Read-only: Business Name */}
            <div className="space-y-2">
              <Label>Business Name</Label>
              <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-muted/30 text-sm text-muted-foreground">
                {client?.business_name || "Not specified"}
              </div>
            </div>

            {/* Read-only: Industry */}
            <div className="space-y-2">
              <Label>Industry</Label>
              <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-muted/30 text-sm text-muted-foreground">
                {client?.industry || "Not specified"}
              </div>
            </div>

            {/* Read-only: Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-muted/30 text-sm text-muted-foreground">
                {profile?.email || "Not specified"}
              </div>
            </div>

            {/* Read-only: Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Business Phone
              </Label>
              <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-muted/30 text-sm text-muted-foreground">
                {client?.phone_number || "Not specified"}
              </div>
            </div>

            {/* Editable: Website URL */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Website URL
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
              Configure your business hours and timezone for AI intelligence
            </p>
          </div>
          <BusinessHoursEditor
            value={businessHours}
            timezone={timezone}
            onChange={handleBusinessHoursChange}
            isEditing={isEditing}
          />
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
            {/* Services Offered */}
            <div className="space-y-2">
              <Label htmlFor="servicesOffered">Services Offered</Label>
              {isEditing ? (
                <Textarea
                  id="servicesOffered"
                  value={Array.isArray(formData.servicesOffered) ? formData.servicesOffered.join('\n') : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, servicesOffered: e.target.value.split('\n').filter(s => s.trim()) }))}
                  rows={4}
                  placeholder="One service per line, e.g.&#10;AI Phone Receptionist&#10;Website Chat Widget"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm min-h-[100px] whitespace-pre-wrap">
                  {Array.isArray(formData.servicesOffered) && formData.servicesOffered.length > 0
                    ? formData.servicesOffered.join('\n')
                    : "Not specified"}
                </div>
              )}
            </div>

            {/* Pricing Info */}
            <div className="space-y-2">
              <Label htmlFor="pricingInfo">Pricing Information <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              {isEditing ? (
                <Input
                  id="pricingInfo"
                  value={formData.pricingInfo}
                  onChange={(e) => handleInputChange("pricingInfo", e.target.value)}
                  placeholder="e.g., From $39/month, Custom pricing"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
                  {formData.pricingInfo || "Not specified"}
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              {isEditing ? (
                <Input
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                  placeholder="e.g., Small businesses, SaaS founders"
                />
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm">
                  {formData.targetAudience || "Not specified"}
                </div>
              )}
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">Conversation Tone</Label>
              {isEditing ? (
                <select
                  id="tone"
                  value={formData.tone}
                  onChange={(e) => handleInputChange("tone", e.target.value)}
                  className="w-full h-10 bg-background border border-white/8 rounded-md px-3"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                </select>
              ) : (
                <div className="p-3 rounded-lg border border-black/[0.05] dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-sm capitalize">
                  {formData.tone || "Not specified"}
                </div>
              )}
            </div>

            {/* Call Transfer Number */}
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