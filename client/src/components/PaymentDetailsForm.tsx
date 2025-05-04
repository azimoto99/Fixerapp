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
      // Stripe.js has not loaded yet
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setLoading(true);

    try {
      // Create a payment method using the card element
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName,
          email: cardholderEmail
        }
      });

      if (error) {
        toast({
          title: 'Payment Error',
          description: error.message || 'An error occurred with your payment',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Payment method was created successfully
      onPaymentSuccess(paymentMethod.id);
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'An error occurred with your payment',
        variant: 'destructive'
      });
    } finally {
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