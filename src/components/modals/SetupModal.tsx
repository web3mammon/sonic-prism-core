import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Phone, Code } from "lucide-react";

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

  // Debug logging
  console.log('SetupModal props:', { isOpen, channelType, twilioPhoneNumber, clientId });

  const showPhone = channelType === "phone" || channelType === "both";
  const showWidget = channelType === "website" || channelType === "both";

  console.log('SetupModal display flags:', { showPhone, showWidget });

  // Widget embed code
  const widgetCode = clientId
    ? `<script src="https://btqccksigmohyjdxgrrj.supabase.co/storage/v1/object/public/widgets/klariqo-widget.js?client_id=${clientId}"></script>`
    : "";

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
                    <li>Forward your business calls to this number</li>
                    <li>Your AI assistant answers 24/7 automatically</li>
                    <li>View all call logs in your dashboard</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Website Widget Section */}
          {showWidget && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Website Widget Setup</h3>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground">
                    Embed Code:
                  </label>
                  <div className="flex items-start gap-2 mt-1">
                    <code className="flex-1 bg-background px-3 py-2 rounded border text-xs font-mono break-all whitespace-pre-wrap max-w-full overflow-hidden">
                      {widgetCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWidget}
                      className="shrink-0"
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
