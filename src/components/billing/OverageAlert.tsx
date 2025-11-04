import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OverageAlertProps {
  minutesTotal: number;
  overageRate: number;
  channelType: 'phone' | 'website' | 'both';
  dismissible?: boolean;
}

export function OverageAlert({ minutesTotal, overageRate, channelType, dismissible = true }: OverageAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const getChannelText = () => {
    if (channelType === 'both') return 'calls or conversations';
    if (channelType === 'phone') return 'calls';
    return 'conversations';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-start gap-3 relative"
      >
        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Overage Charges Active</p>
          <p className="text-xs text-muted-foreground">
            You have reached your base plan limit of {minutesTotal} minutes.
            You are now incurring overage charges at <strong>${overageRate}/minute</strong> for {getChannelText()}.
            This is just a notification, no action required from your end.
          </p>
        </div>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-orange-500/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4 text-orange-500" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
