import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle, MessageSquare } from "lucide-react";

export default function ContactUs() {
  const { client, loading } = useCurrentClient();
  const { toast } = useToast();

  const [reason, setReason] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Auto-populate message when "Phone Provisioning" is selected
  const handleReasonChange = (value: string) => {
    setReason(value);

    if (value === "phone_provisioning") {
      setMessage(
        `I need a phone number provisioned for my account.\n\n` +
        `Client ID: ${client?.client_id || 'N/A'}\n` +
        `Client Slug: ${client?.client_slug || 'N/A'}\n` +
        `Business Name: ${client?.business_name || 'N/A'}\n\n` +
        `Please provision a phone number and update my account. Thank you!`
      );
    } else {
      setMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast({
        title: "Error",
        description: "Please select a reason for contacting us.",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive"
      });
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          reason,
          message,
          client_id: client?.client_id,
          client_slug: client?.client_slug,
          business_name: client?.business_name,
          user_email: client?.user_id // Will fetch from auth.users in edge function
        }
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setReason("");
        setMessage("");
        setSent(false);
      }, 3000);

    } catch (error: any) {
      console.error('[ContactUs] Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 font-manrope relative">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08] text-black dark:text-white"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-5xl font-extralight mb-2">Contact & Support</h1>
        <p className="text-muted-foreground">
          Need help or have a question? Send us a message and we'll get back to you within 24 hours.
        </p>
      </motion.div>

      {/* Contact Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-black/[0.08] dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-6 space-y-6 max-w-3xl"
      >
        {/* Card Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-2xl font-extralight">Send us a message</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Contact</label>
            <Select value={reason} onValueChange={handleReasonChange}>
              <SelectTrigger className="bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.08] dark:border-white/8">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general_query">General Query</SelectItem>
                <SelectItem value="dashboard_issues">Dashboard Issues</SelectItem>
                <SelectItem value="phone_provisioning">Phone Provisioning</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you need help with..."
              className="min-h-[200px] bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.08] dark:border-white/8 resize-none"
              disabled={sending || sent}
            />
            <p className="text-xs text-muted-foreground">
              Your client information will be automatically included in the message.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12"
            disabled={sending || sent}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : sent ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Message Sent!
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </motion.div>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-center text-sm text-muted-foreground max-w-3xl"
      >
        For urgent issues, you can also email us directly at{" "}
        <a href="mailto:ansh@klariqo.com" className="text-primary hover:underline">
          ansh@klariqo.com
        </a>
      </motion.div>
    </div>
  );
}
