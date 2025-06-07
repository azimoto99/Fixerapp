import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DbUser } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePaymentDialog } from '@/components/payments/PaymentDialogManager';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  ArrowDownLeft,
  Download
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PaymentContentProps {
  user: DbUser;
}

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

const PaymentContent: React.FC<PaymentContentProps> = ({ user }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const { openAddPaymentMethod } = usePaymentDialog();

  // Fetch payments data
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/payments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/payments');
      return response;
    },
    enabled: !!user,
  });

  // Fetch payment methods
  const { 
    data: paymentMethods, 
    isLoading: paymentMethodsLoading, 
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
    enabled: !!user,
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (paymentsLoading || paymentMethodsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your saved payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethodsLoading ? (
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
        <CardFooter className="space-y-2">
          <Button 
            onClick={openAddPaymentMethod}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Payment Method
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Your payment information is securely processed by Stripe
          </p>
        </CardFooter>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Payment History
          </CardTitle>
        </CardHeader>        <CardContent>
          <ScrollArea className="h-64">
            {payments && Array.isArray(payments) && payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <ArrowDownLeft className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-sm font-medium">{payment.description || 'Job Payment'}</p>
                        <p className="text-xs text-gray-500">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        -{formatCurrency(payment.amount || 0)}
                      </p>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <ArrowDownLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payments yet</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentContent; 