import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  ChevronsUpDown,
  Edit,
  Landmark,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  useStripe, 
  useElements, 
  PaymentElement,
  CardElement,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Ensure Stripe is initialized with public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  bank_account?: {
    bank_name: string;
    last4: string;
    routing_number: string;
  };
  billing_details: {
    name: string;
    email: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  isDefault: boolean;
}

const PaymentMethodItem: React.FC<{
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (method: PaymentMethod) => void;
}> = ({ method, onSetDefault, onDelete, onEdit }) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg mb-3">
      <div className="flex items-center gap-3">
        {method.type === 'card' ? (
          <div className="bg-primary/10 p-2 rounded-md">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <div className="bg-primary/10 p-2 rounded-md">
            <Landmark className="h-5 w-5 text-primary" />
          </div>
        )}
        
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {method.type === 'card' 
                ? `${method.card?.brand?.toUpperCase() || 'Card'} •••• ${method.card?.last4}` 
                : `${method.bank_account?.bank_name || 'Bank'} •••• ${method.bank_account?.last4}`}
            </p>
            {method.isDefault && (
              <Badge variant="secondary" className="ml-2">Default</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {method.type === 'card' 
              ? `Expires ${method.card?.exp_month}/${method.card?.exp_year}` 
              : `Routing: ${method.bank_account?.routing_number?.slice(0, 3)}••••`}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onEdit(method)}
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        
        {!method.isDefault && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onSetDefault(method.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="sr-only">Set as default</span>
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onDelete(method.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
};

const AddPaymentMethodForm: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred while processing your card');
        return;
      }

      // Save the payment method to the server
      const response = await apiRequest('POST', '/api/payment-methods/add', {
        paymentMethodId: paymentMethod.id,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save payment method');
      }

      toast({
        title: 'Payment Method Added',
        description: 'Your payment method has been successfully added.',
      });

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
      toast({
        title: 'Error',
        description: err.message || 'Failed to add payment method',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Information</label>
        <div className="border rounded-md p-3">
          <CardElement 
            options={{
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
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isProcessing}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? (
            <>
              <ChevronsUpDown className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Add Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
};

export function PaymentMethodManagerContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addPaymentMethodOpen, setAddPaymentMethodOpen] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Query payment methods
  const { data: paymentMethods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods'],
    enabled: !!user,
  });

  // Setup payment intent when adding a payment method
  useEffect(() => {
    if (addPaymentMethodOpen && !clientSecret) {
      const setupIntent = async () => {
        try {
          const response = await apiRequest('POST', '/api/payment-methods/setup-intent', {});
          const data = await response.json();
          setClientSecret(data.clientSecret);
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to prepare payment method setup',
            variant: 'destructive',
          });
        }
      };

      setupIntent();
    }
  }, [addPaymentMethodOpen, clientSecret, toast]);

  // Mutations
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('POST', '/api/payment-methods/set-default', { paymentMethodId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: 'Default Updated',
        description: 'Your default payment method has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update default payment method',
        variant: 'destructive',
      });
    }
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiRequest('DELETE', `/api/payment-methods/${paymentMethodId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      toast({
        title: 'Payment Method Removed',
        description: 'Your payment method has been successfully removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove payment method',
        variant: 'destructive',
      });
    }
  });

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      deletePaymentMethodMutation.mutate(id);
    }
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditPaymentMethod(method);
  };

  const handleAddSuccess = () => {
    setAddPaymentMethodOpen(false);
    setClientSecret(null);
    queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Manage your payment methods for receiving payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cards" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="bank">Bank Accounts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cards" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="py-8 text-center">
                <ChevronsUpDown className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading payment methods...</p>
              </div>
            ) : !paymentMethods?.length || !paymentMethods.filter(m => m.type === 'card').length ? (
              <div className="py-8 text-center border rounded-lg">
                <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No card payment methods found</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setAddPaymentMethodOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Payment Card
                </Button>
              </div>
            ) : (
              <div>
                {paymentMethods
                  .filter(method => method.type === 'card')
                  .map(method => (
                    <PaymentMethodItem
                      key={method.id}
                      method={method}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))
                }
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="bank" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="py-8 text-center">
                <ChevronsUpDown className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Loading bank accounts...</p>
              </div>
            ) : !paymentMethods?.length || !paymentMethods.filter(m => m.type === 'bank_account').length ? (
              <div className="py-8 text-center border rounded-lg">
                <Landmark className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No bank accounts found</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setAddPaymentMethodOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Bank Account
                </Button>
              </div>
            ) : (
              <div>
                {paymentMethods
                  .filter(method => method.type === 'bank_account')
                  .map(method => (
                    <PaymentMethodItem
                      key={method.id}
                      method={method}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))
                }
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Your payment information is securely stored with Stripe.
        </p>
        <Button 
          onClick={() => setAddPaymentMethodOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </CardFooter>

      {/* Add Payment Method Dialog */}
      <Dialog open={addPaymentMethodOpen} onOpenChange={setAddPaymentMethodOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new card or bank account for receiving payments
            </DialogDescription>
          </DialogHeader>
          
          {clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{ clientSecret }}
            >
              <AddPaymentMethodForm 
                onSuccess={handleAddSuccess}
                onCancel={() => setAddPaymentMethodOpen(false)}
              />
            </Elements>
          ) : (
            <div className="py-8 text-center">
              <ChevronsUpDown className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Preparing payment form...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Method Dialog - To be implemented */}
      <Dialog open={!!editPaymentMethod} onOpenChange={() => setEditPaymentMethod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
            <DialogDescription>
              Update your payment method details
            </DialogDescription>
          </DialogHeader>
          
          {editPaymentMethod && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Type</h3>
                  <p>{editPaymentMethod.type === 'card' ? 'Credit Card' : 'Bank Account'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Details</h3>
                  <p>
                    {editPaymentMethod.type === 'card'
                      ? `${editPaymentMethod.card?.brand} ending in ${editPaymentMethod.card?.last4}`
                      : `${editPaymentMethod.bank_account?.bank_name} ending in ${editPaymentMethod.bank_account?.last4}`
                    }
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-2">Billing Information</h3>
                <p className="text-sm">{editPaymentMethod.billing_details.name}</p>
                <p className="text-sm">{editPaymentMethod.billing_details.email}</p>
                {editPaymentMethod.billing_details.address && (
                  <div className="text-sm">
                    <p>{editPaymentMethod.billing_details.address.line1}</p>
                    {editPaymentMethod.billing_details.address.line2 && (
                      <p>{editPaymentMethod.billing_details.address.line2}</p>
                    )}
                    <p>
                      {editPaymentMethod.billing_details.address.city}, 
                      {editPaymentMethod.billing_details.address.state} 
                      {editPaymentMethod.billing_details.address.postal_code}
                    </p>
                    <p>{editPaymentMethod.billing_details.address.country}</p>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                To update card details, you'll need to add a new payment method and remove this one.
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setEditPaymentMethod(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Wrapper component that ensures Stripe is loaded
export default function PaymentMethodManager() {
  return (
    <PaymentMethodManagerContent />
  );
}