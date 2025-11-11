import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Phone, Code, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelType: "phone" | "website" | "both" | null;
  twilioPhoneNumber?: string | null;
  clientId?: string;
}

export function SetupModal({
  isOpen,
  onClose,
  channelType,
  twilioPhoneNumber,
  clientId,
}: SetupModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [widgetCode, setWidgetCode] = useState("");
  const [loadingWidget, setLoadingWidget] = useState(false);
  const { region, industry, clientname } = useTenant();

  const showPhone = channelType === "phone" || channelType === "both";
  const showWidget = channelType === "website" || channelType === "both";

  // Fetch actual widget embed code from database
  useEffect(() => {
    async function fetchWidgetCode() {
      if (!clientId || !showWidget) return;

      setLoadingWidget(true);
      try {
        const { data, error } = await supabase
          .from('widget_config')
          .select('embed_code')
          .eq('client_id', clientId)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

        // Error means a real query error (not just "no rows")
        if (error) {
          console.error('Error fetching widget config:', error);
          // Still provide fallback
          setWidgetCode(`<script src="https://cdn.klariqo.com/widgets/klariqo-widget-v2.js?client_id=${clientId}"></script>`);
        } else if (data?.embed_code) {
          // Widget config exists - use it
          setWidgetCode(data.embed_code);
        } else {
          // No widget config exists (phone-only client) - use fallback
          setWidgetCode(`<script src="https://cdn.klariqo.com/widgets/klariqo-widget-v2.js?client_id=${clientId}"></script>`);
        }
      } catch (error) {
        console.error('Unexpected error fetching widget code:', error);
        // Fallback to basic code
        setWidgetCode(`<script src="https://cdn.klariqo.com/widgets/klariqo-widget-v2.js?client_id=${clientId}"></script>`);
      } finally {
        setLoadingWidget(false);
      }
    }

    fetchWidgetCode();
  }, [clientId, showWidget, isOpen]);

  const handleCopyPhone = () => {
    if (twilioPhoneNumber) {
      navigator.clipboard.writeText(twilioPhoneNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleCopyWidget = () => {
    navigator.clipboard.writeText(widgetCode);
    setCopiedWidget(true);
    setTimeout(() => setCopiedWidget(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">
            Setup Your AI Assistant
          </DialogTitle>
          <DialogDescription>
            Get your AI assistant up and running with these simple setup instructions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-hidden">
          {/* Phone Setup Section */}
          {showPhone && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Phone Setup</h3>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Your AI Phone Number:
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {twilioPhoneNumber ? (
                      <>
                        <code className="flex-1 bg-background px-3 py-2 rounded border text-lg font-mono">
                          {twilioPhoneNumber}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyPhone}
                          className="shrink-0"
                        >
                          {copiedPhone ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="flex-1 bg-background px-3 py-2 rounded border text-sm text-muted-foreground italic">
                        Phone number provisioning in progress...
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm space-y-1 text-muted-foreground">
                  <p className="font-medium text-foreground">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Use this number directly or forward your existing business line to it</li>
                    <li>Your AI assistant answers 24/7 automatically</li>
                    <li>View all call logs and transcripts in your dashboard</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Website Widget Section */}
          {showWidget && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Website Widget Setup</h3>
                </div>
                <Link
                  to={`/${region}/${industry}/${clientname}/widget-settings`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={onClose}
                >
                  Customize Widget
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Embed Code:
                  </label>
                  <div className="flex items-start gap-2 mt-1">
                    {loadingWidget ? (
                      <div className="flex-1 bg-background px-3 py-2 rounded border text-xs text-muted-foreground italic">
                        Loading widget code...
                      </div>
                    ) : (
                      <>
                        <code className="flex-1 bg-background px-3 py-2 rounded border text-xs font-mono break-all whitespace-pre-wrap max-w-full overflow-hidden">
                          {widgetCode}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyWidget}
                          className="shrink-0"
                          disabled={!widgetCode}
                        >
                          {copiedWidget ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-sm space-y-1 text-muted-foreground">
                  <p className="font-medium text-foreground">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Copy the code above</li>
                    <li>
                      Paste it before the <code>&lt;/body&gt;</code> tag in your HTML
                    </li>
                    <li>The widget will appear on all pages automatically</li>
                    <li>
                      Customize colors, position, and more in{" "}
                      <Link
                        to={`/${region}/${industry}/${clientname}/widget-settings`}
                        className="text-primary hover:underline"
                        onClick={onClose}
                      >
                        Widget Settings
                      </Link>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Fallback if no channel configured */}
          {!showPhone && !showWidget && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No channels configured yet. Please contact support to set up your AI assistant.</p>
              <p className="text-xs mt-2">Channel type: {channelType || 'none'}</p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={onClose} variant="default">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
