import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface PaymentDetailsFormProps {
  amount: number;
  jobTitle: string;
  onPaymentSuccess: (paymentMethodId: string) => void;
  onPaymentCancel: () => void;
}

const PaymentForm = ({ amount, jobTitle, onPaymentSuccess, onPaymentCancel }: PaymentDetailsFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [cardholderEmail, setCardholderEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: 'Payment Error',
        description: 'Payment system is still loading. Please wait a moment and try again.',
        variant: 'destructive'
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast({
        title: 'Payment Error',
        description: 'Card information is missing. Please refresh the page and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Validate required fields
    if (!cardholderName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter the cardholder name.',
        variant: 'destructive'
      });
      return;
    }

    if (!cardholderEmail.trim() || !cardholderEmail.includes('@')) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // First validate the card
      const { error: cardError } = await stripe.createToken(cardElement);
      if (cardError) {
        throw new Error(cardError.message);
      }

      // Create a payment method using the card element
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName.trim(),
          email: cardholderEmail.trim()
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create payment method');
      }

      if (!paymentMethod) {
        throw new Error('Payment method creation failed');
      }

      // Payment method was created successfully
      toast({
        title: 'Payment Method Created',
        description: 'Processing your payment...',
      });

      onPaymentSuccess(paymentMethod.id);
    } catch (error: any) {
      console.error('Payment method creation error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'An error occurred with your payment. Please check your card details and try again.',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardholderEmail">Email</Label>
        <Input
          id="cardholderEmail"
          type="email"
          value={cardholderEmail}
          onChange={(e) => setCardholderEmail(e.target.value)}
          placeholder="email@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="card-element">Credit or Debit Card</Label>
        <div className="p-3 border rounded-md">
          <CardElement id="card-element" options={cardElementOptions} />
        </div>
      </div>

      <div className="pt-2 flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPaymentCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading}
        >
          {loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
};

export default function PaymentDetailsForm({ amount, jobTitle, onPaymentSuccess, onPaymentCancel }: PaymentDetailsFormProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Enter your card details to pay for "{jobTitle}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise}>
          <PaymentForm 
            amount={amount} 
            jobTitle={jobTitle} 
            onPaymentSuccess={onPaymentSuccess} 
            onPaymentCancel={onPaymentCancel} 
          />
        </Elements>
      </CardContent>
    </Card>
  );
}