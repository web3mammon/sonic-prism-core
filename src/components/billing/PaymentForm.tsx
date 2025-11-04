import { useState } from "react";
import { ModernButton } from "@/components/ui/modern-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Shield, Lock } from "lucide-react";

interface PaymentFormProps {
  onSubmit: (cardDetails: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  }) => Promise<void>;
  isProcessing: boolean;
}

export function PaymentForm({ onSubmit, isProcessing }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Format card number with spaces (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, ''); // Remove spaces
    if (value.length > 16) return; // Max 16 digits

    // Add space every 4 digits
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    // Clear error
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: '' }));
    }
  };

  // Format expiry date (MM/YY)
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 4) return; // Max MMYY

    // Add slash after MM
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    setExpiryDate(value);

    // Clear error
    if (errors.expiryDate) {
      setErrors(prev => ({ ...prev, expiryDate: '' }));
    }
  };

  // Format CVV (max 4 digits)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 4) return;
    setCvv(value);

    // Clear error
    if (errors.cvv) {
      setErrors(prev => ({ ...prev, cvv: '' }));
    }
  };

  // Validate card number (Luhn algorithm)
  const validateCardNumber = (number: string): boolean => {
    const digits = number.replace(/\s/g, '');
    if (digits.length !== 16) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  };

  // Validate expiry date
  const validateExpiryDate = (expiry: string): { valid: boolean; month?: string; year?: string } => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return { valid: false };

    const [month, year] = expiry.split('/');
    const monthNum = parseInt(month);
    const yearNum = parseInt(`20${year}`);

    if (monthNum < 1 || monthNum > 12) return { valid: false };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
      return { valid: false };
    }

    return { valid: true, month, year };
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate card number
    if (!cardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!validateCardNumber(cardNumber)) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Validate expiry date
    if (!expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else {
      const expiryValidation = validateExpiryDate(expiryDate);
      if (!expiryValidation.valid) {
        newErrors.expiryDate = 'Invalid or expired date';
      }
    }

    // Validate CVV
    if (!cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (cvv.length < 3) {
      newErrors.cvv = 'CVV must be 3-4 digits';
    }

    // Validate cardholder name
    if (!cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const expiryValidation = validateExpiryDate(expiryDate);

    await onSubmit({
      cardNumber: cardNumber.replace(/\s/g, ''),
      expiryMonth: expiryValidation.month!,
      expiryYear: expiryValidation.year!,
      cvv,
      cardholderName: cardholderName.trim()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={handleCardNumberChange}
            disabled={isProcessing}
            className={`pl-10 ${errors.cardNumber ? 'border-red-500' : ''}`}
          />
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        {errors.cardNumber && (
          <p className="text-xs text-red-500">{errors.cardNumber}</p>
        )}
      </div>

      {/* Cardholder Name */}
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          type="text"
          placeholder="John Doe"
          value={cardholderName}
          onChange={(e) => {
            setCardholderName(e.target.value);
            if (errors.cardholderName) {
              setErrors(prev => ({ ...prev, cardholderName: '' }));
            }
          }}
          disabled={isProcessing}
          className={errors.cardholderName ? 'border-red-500' : ''}
        />
        {errors.cardholderName && (
          <p className="text-xs text-red-500">{errors.cardholderName}</p>
        )}
      </div>

      {/* Expiry Date & CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiryDate">Expiry Date</Label>
          <Input
            id="expiryDate"
            type="text"
            placeholder="MM/YY"
            value={expiryDate}
            onChange={handleExpiryDateChange}
            disabled={isProcessing}
            className={errors.expiryDate ? 'border-red-500' : ''}
          />
          {errors.expiryDate && (
            <p className="text-xs text-red-500">{errors.expiryDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvv">CVV</Label>
          <Input
            id="cvv"
            type="text"
            placeholder="123"
            value={cvv}
            onChange={handleCvvChange}
            disabled={isProcessing}
            className={errors.cvv ? 'border-red-500' : ''}
          />
          {errors.cvv && (
            <p className="text-xs text-red-500">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing}
        className="block w-full bg-primary text-white px-8 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing Payment...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Pay Now
          </span>
        )}
      </button>

      {/* Trust Badges */}
      <div className="flex flex-col items-center gap-3 pt-2">
        {/* Card Network Icons */}
        <div className="flex items-center gap-3">
          <svg className="h-8 w-auto opacity-60" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="currentColor" fillOpacity="0.1"/>
            <text x="24" y="20" fontSize="10" fontWeight="600" textAnchor="middle" fill="currentColor" opacity="0.7">VISA</text>
          </svg>
          <svg className="h-8 w-auto opacity-60" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="currentColor" fillOpacity="0.1"/>
            <circle cx="18" cy="16" r="8" fill="currentColor" opacity="0.5"/>
            <circle cx="30" cy="16" r="8" fill="currentColor" opacity="0.5"/>
          </svg>
          <svg className="h-8 w-auto opacity-60" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="32" rx="4" fill="currentColor" fillOpacity="0.1"/>
            <text x="24" y="20" fontSize="8" fontWeight="600" textAnchor="middle" fill="currentColor" opacity="0.7">AMEX</text>
          </svg>
        </div>

        {/* Security Badges */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-green-500" />
            <span>SSL Secure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-green-500" />
            <span>256-bit Encryption</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-2">
        Your payment information is secure and encrypted. We never store your card details.
      </p>
    </form>
  );
}
