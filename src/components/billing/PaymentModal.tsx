import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
  });

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value.replace(/\D/g, "")).slice(0, 19);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value).slice(0, 5);
    } else if (field === "cvv") {
      formattedValue = value.replace(/\D/g, "").slice(0, 3);
    }

    setCardDetails((prev) => ({ ...prev, [field]: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // TODO: Integrate with Cashfree SDK
    // This is where we'll call the backend to create an order
    // and process the payment with Cashfree

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`Successfully added ${currency.symbol}${amount} credits!`);
      onClose();
      // Reset form
      setCardDetails({
        cardNumber: "",
        cardHolder: "",
        expiry: "",
        cvv: "",
      });
    }, 2000);
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
            Securely add {currency.symbol}{amount} for {calls} calls
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
              <span className="font-medium">{currency.symbol}2</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold">{currency.symbol}{amount}</span>
            </div>
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardDetails.cardNumber}
              onChange={(e) => handleInputChange("cardNumber", e.target.value)}
              required
              maxLength={19}
            />
          </div>

          {/* Card Holder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardHolder">Cardholder Name</Label>
            <Input
              id="cardHolder"
              placeholder="John Doe"
              value={cardDetails.cardHolder}
              onChange={(e) => handleInputChange("cardHolder", e.target.value)}
              required
            />
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={cardDetails.expiry}
                onChange={(e) => handleInputChange("expiry", e.target.value)}
                required
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="password"
                placeholder="123"
                value={cardDetails.cvv}
                onChange={(e) => handleInputChange("cvv", e.target.value)}
                required
                maxLength={3}
              />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Your payment information is encrypted and secure</span>
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
              disabled={isProcessing}
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
