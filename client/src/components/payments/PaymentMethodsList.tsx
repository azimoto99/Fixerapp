import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePaymentDialog } from '@/components/payments/PaymentDialogManager';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Interface for payment method
interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    exp_month: number;
    exp_year: number;
    last4: string;
    country: string;
  };
}

// Format card brand to capitalize first letter
const formatCardBrand = (brand: string): string => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

// Get card icon
const getCardIcon = (brand: string) => {
  return <CreditCard className="h-4 w-4" />;
};

// Main payment methods list component
export default function PaymentMethodsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const { openAddPaymentMethod } = usePaymentDialog();

  // Fetch payment methods
  const { 
    data: paymentMethods, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/stripe/payment-methods');
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      return response.json();
    },
  });

  // Set default payment method
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', '/api/stripe/set-default-payment-method', { id });
      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({
        title: 'Default Payment Method',
        description: 'Your default payment method has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  });

  // Delete payment method
  const deleteMethod = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/stripe/payment-methods/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({
        title: 'Payment Method Removed',
        description: 'The payment method has been removed from your account.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  });

  const handleSetDefault = (id: string) => {
    setSelectedMethod(id);
    setDefault.mutate(id);
  };

  const handleDeleteMethod = (id: string) => {
    deleteMethod.mutate(id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your saved payment methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load payment methods'}
            </AlertDescription>
          </Alert>
        ) : paymentMethods && paymentMethods.length > 0 ? (
          <RadioGroup
            value={selectedMethod}
            onValueChange={handleSetDefault}
            className="space-y-3"
          >
            {paymentMethods.map((method: PaymentMethod) => (
              <div 
                key={method.id}
                className="flex items-center justify-between space-x-2 rounded-md border border-border p-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex items-center cursor-pointer">
                    <div className="mr-2">
                      {getCardIcon(method.card.brand)}
                    </div>
                    <div>
                      <span className="font-medium">{formatCardBrand(method.card.brand)}</span>
                      <span className="ml-2">•••• {method.card.last4}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        Expires {method.card.exp_month}/{method.card.exp_year % 100}
                      </span>
                    </div>
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteMethod(method.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <div className="text-center py-8 space-y-2 border border-dashed rounded-md p-6">
            <CreditCard className="mx-auto h-8 w-8 opacity-30" />
            <p className="text-muted-foreground">No payment methods saved yet</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={openAddPaymentMethod}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </CardFooter>
    </Card>
  );
}