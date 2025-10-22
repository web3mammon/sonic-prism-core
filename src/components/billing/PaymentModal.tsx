import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  calls: number;
  currency: {
    code: string;
    symbol: string;
  };
}

export function PaymentModal({ open, onClose, amount, calls, currency }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [cashfreeInstance, setCashfreeInstance] = useState<any>(null);
  const [cardComponent, setCardComponent] = useState<any>(null);
  const [cardholderName, setCardholderName] = useState("");

  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);

  // Initialize Cashfree SDK and create order when modal opens
  useEffect(() => {
    if (!open) return;

    const initializeCashfree = async () => {
      // Load Cashfree SDK
      if (!(window as any).Cashfree) {
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => setupCashfree();
        document.head.appendChild(script);
      } else {
        setupCashfree();
      }
    };

    const setupCashfree = async () => {
      try {
        // Create order first
        // Get the current path to maintain region/industry/clientname structure
        const currentPath = window.location.pathname; // e.g., /au/plumbing/acme-plumbing/billing
        const billingBasePath = currentPath.split('?')[0]; // Remove any existing query params
        const returnUrl = `${window.location.origin}${billingBasePath}?payment=success`;

        console.log('[PaymentModal] Current path:', currentPath);
        console.log('[PaymentModal] Billing base path:', billingBasePath);
        console.log('[PaymentModal] Return URL:', returnUrl);

        const { data, error } = await supabase.functions.invoke('create-credit-topup', {
          body: {
            calls: calls,
            currency: currency.code,
            return_url: returnUrl
          }
        });

        if (error || !data?.payment_session_id) {
          toast.error('Failed to initialize payment');
          return;
        }

        setPaymentSessionId(data.payment_session_id);

        // Initialize Cashfree
        const cashfree = (window as any).Cashfree({ mode: "sandbox" });
        setCashfreeInstance(cashfree);
        console.log('[Cashfree] Initialized cashfree instance:', cashfree);

        // Match the styling of our Input components exactly
        // Check if dark theme is active
        const isDark = document.documentElement.classList.contains('dark');

        const elementStyle = {
          base: {
            color: isDark ? "#ffffff" : "#09090b",
            backgroundColor: isDark ? "#09090b" : "#ffffff",
            fontSize: "14px",
            fontFamily: "Manrope, system-ui, -apple-system, sans-serif",
            fontWeight: "400",
            lineHeight: "1.5",
            "::placeholder": {
              color: isDark ? "#71717a" : "#a1a1aa"
            }
          },
          invalid: {
            color: "#ef4444"
          }
        };

        // Create card components with platform-matched styling
        const cardNumber = cashfree.create("cardNumber", {
          placeholder: "1234 1234 1234 1234",
          style: elementStyle
        });
        const cardExpiry = cashfree.create("cardExpiry", {
          placeholder: "MM/YY",
          style: elementStyle
        });
        const cardCvv = cashfree.create("cardCvv", {
          placeholder: "123",
          style: elementStyle
        });

        console.log('[Cashfree] Created elements:', { cardNumber, cardExpiry, cardCvv });

        // Mount components
        if (cardNumberRef.current) {
          console.log('[Cashfree] Mounting cardNumber to:', cardNumberRef.current);
          cardNumber.mount(cardNumberRef.current);
        }
        if (cardExpiryRef.current) {
          console.log('[Cashfree] Mounting cardExpiry to:', cardExpiryRef.current);
          cardExpiry.mount(cardExpiryRef.current);
        }
        if (cardCvvRef.current) {
          console.log('[Cashfree] Mounting cardCvv to:', cardCvvRef.current);
          cardCvv.mount(cardCvvRef.current);
        }

        // Listen to element events
        cardNumber.on('ready', () => console.log('[Cashfree] cardNumber ready'));
        cardNumber.on('change', (event: any) => console.log('[Cashfree] cardNumber change:', event));
        cardNumber.on('blur', () => console.log('[Cashfree] cardNumber blur'));
        cardNumber.on('focus', () => console.log('[Cashfree] cardNumber focus'));

        setCardComponent(cardNumber);
      } catch (error) {
        console.error('Cashfree init error:', error);
        toast.error('Failed to initialize payment');
      }
    };

    initializeCashfree();
  }, [open, calls, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardholderName.trim()) {
      toast.error('Please enter cardholder name');
      return;
    }

    if (!cashfreeInstance || !cardComponent || !paymentSessionId) {
      toast.error('Payment not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      // Process payment using card component
      const result = await cashfreeInstance.pay({
        paymentMethod: cardComponent,
        paymentSessionId: paymentSessionId,
      });

      console.log('Payment result:', result);
      console.log('Payment result type:', typeof result);
      console.log('Payment result keys:', Object.keys(result || {}));

      if (result.paymentDetails?.paymentMessage) {
        if (result.paymentDetails.paymentMessage === 'SUCCESS' ||
            result.paymentDetails.paymentMessage === 'PENDING') {
          toast.success('Payment successful! Credits will be added shortly.');
          onClose();
          // Refresh page to show updated credits
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error(`Payment failed: ${result.paymentDetails.paymentMessage}`);
        }
      } else {
        // Handle other result formats
        console.error('Unexpected payment result format:', result);
        toast.error('Payment processing - check console for details');
      }
    } catch (error: any) {
      console.error('Payment error (full):', error);
      console.error('Payment error message:', error?.message);
      console.error('Payment error stack:', error?.stack);
      console.error('Payment error stringified:', JSON.stringify(error, null, 2));

      const errorMsg = error?.message || error?.error || JSON.stringify(error);
      toast.error(`Payment failed: ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Credits
          </DialogTitle>
          <DialogDescription>
            Enter your card details to complete payment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Calls</span>
              <span className="font-medium">{calls} calls</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost per call</span>
              <span className="font-medium">{currency.symbol}{(amount / calls).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold">{currency.symbol}{amount}</span>
            </div>
          </div>

          {/* Cardholder Name - Regular Input */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName">Cardholder Name</Label>
            <Input
              id="cardholderName"
              placeholder="John Doe"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              required
            />
          </div>

          {/* Card Number - Cashfree Element */}
          <div className="space-y-2">
            <Label>Card Number</Label>
            <div
              ref={cardNumberRef}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Expiry and CVV - Cashfree Elements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <div
                ref={cardExpiryRef}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label>CVV</Label>
              <div
                ref={cardCvvRef}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Powered by Cashfree - Your payment is encrypted and secure</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isProcessing || !cardComponent}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay {currency.symbol}{amount}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
