import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';

// UI Components
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from '@/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Icons
import { 
  Loader2, 
  Search, 
  Plus, 
  CreditCard, 
  FileText, 
  ArrowRight,
  DollarSign,
  Banknote,
  PlusCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Receipt,
  RefreshCw,
  ExternalLink,
  BanknoteIcon,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  CreditCard as CreditCardIcon,
  History,
  X
} from 'lucide-react';

// Custom Components
import PaymentDetailsCard from '@/components/payments/PaymentDetailsCard';
import JobPaymentForm from '@/components/payments/JobPaymentForm';
import { usePaymentDialog } from '@/components/payments/PaymentDialogManager';
import PaymentMethodsList from '@/components/payments/PaymentMethodsList';

interface PaymentsContentProps {
  userId: number;
}

// Improved status badge with better visual indicators
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { 
          bgColor: 'bg-green-50 dark:bg-green-900/30',
          textColor: 'text-green-700 dark:text-green-400', 
          borderColor: 'border-green-200 dark:border-green-800',
          icon: <CheckCircle className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" /> 
        }; 
      case 'pending':
        return { 
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
          textColor: 'text-yellow-700 dark:text-yellow-400', 
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          icon: <Clock className="h-3 w-3 mr-1 text-yellow-600 dark:text-yellow-400" /> 
        };
      case 'processing':
        return { 
          bgColor: 'bg-blue-50 dark:bg-blue-900/30',
          textColor: 'text-blue-700 dark:text-blue-400', 
          borderColor: 'border-blue-200 dark:border-blue-800',
          icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin text-blue-600 dark:text-blue-400" /> 
        };
      case 'failed':
        return { 
          bgColor: 'bg-red-50 dark:bg-red-900/30',
          textColor: 'text-red-700 dark:text-red-400', 
          borderColor: 'border-red-200 dark:border-red-800',
          icon: <AlertCircle className="h-3 w-3 mr-1 text-red-600 dark:text-red-400" /> 
        };
      default:
        return { 
          bgColor: 'bg-gray-50 dark:bg-gray-800/50',
          textColor: 'text-gray-700 dark:text-gray-400', 
          borderColor: 'border-gray-200 dark:border-gray-700',
          icon: null 
        };
    }
  };

  const { bgColor, textColor, borderColor, icon } = getStatusConfig();
  
  return (
    <Badge 
      variant="outline" 
      className={`${bgColor} ${textColor} ${borderColor} font-normal text-xs py-0.5 px-2 h-5 border`}
    >
      <span className="flex items-center">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </span>
    </Badge>
  );
};

const PaymentsContentV2: React.FC<PaymentsContentProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('methods');
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { openPaymentDialog, closePaymentDialog } = usePaymentDialog();
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Fetch payment methods
  const { 
    data: paymentMethods, 
    isLoading: isLoadingMethods, 
    refetch: refetchMethods,
    error: methodsError
  } = useQuery({
    queryKey: ['/api/stripe/payment-methods'],
    retry: false
  });
  
  // Fetch payments history
  const { 
    data: payments, 
    isLoading: isLoadingPayments,
    refetch: refetchPayments,
    error: paymentsError
  } = useQuery({
    queryKey: [`/api/payments/user/${userId}`],
    retry: false
  });
  
  // Mutations for payment methods
  const deleteMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('DELETE', `/api/stripe/payment-methods/${paymentMethodId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete payment method');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment method removed",
        description: "Your payment method has been successfully removed.",
        variant: "default",
      });
      refetchMethods();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete payment method: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  const setDefaultMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest('POST', `/api/stripe/payment-methods/${paymentMethodId}/default`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set default payment method');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Default method updated",
        description: "Your default payment method has been updated.",
        variant: "default",
      });
      refetchMethods();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update default method: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Handle adding a new payment method
  const handleAddPaymentMethod = () => {
    // Simple toast notification since we're still working on the full payment integration
    toast({
      title: "Payment Feature",
      description: "This would open the payment method setup dialog in the complete implementation.",
    });
    
    // Simulated success action
    setTimeout(() => {
      refetchMethods();
    }, 500);
  };
  
  // Handle deleting a payment method
  const handleDeleteMethod = (paymentMethodId: string) => {
    deleteMethodMutation.mutate(paymentMethodId);
  };
  
  // Handle setting a default payment method
  const handleSetDefaultMethod = (paymentMethodId: string) => {
    setDefaultMethodMutation.mutate(paymentMethodId);
  };
  
  // View payment details
  const handleViewPaymentDetails = (payment: any) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };
  
  // Filter payments by status
  const getFilteredPayments = (status: string) => {
    if (!payments) return [];
    return payments.filter((payment: any) => payment.status.toLowerCase() === status.toLowerCase());
  };
  
  const pendingPayments = getFilteredPayments('pending');
  const completedPayments = getFilteredPayments('completed');
  
  // Format card number for display
  const formatCardNumber = (cardNumber: string) => {
    return `•••• ${cardNumber.slice(-4)}`;
  };
  
  // Format date for display
  const formatPaymentDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Handle error states
  if (methodsError && paymentsError) {
    return (
      <div className="p-4">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center gap-2">
              <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Unable to load payment information</h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                There was an error loading your payment details. Please try again later.
              </p>
              <Button 
                variant="outline" 
                className="mt-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400"
                onClick={() => {
                  refetchMethods();
                  refetchPayments();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Payments & Billing</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="methods" className="text-xs">
            <CreditCardIcon className="h-3.5 w-3.5 mr-1.5" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Payment History
          </TabsTrigger>
        </TabsList>
        
        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4 pt-2">
          {isLoadingMethods ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {paymentMethods?.length > 0 
                    ? `You have ${paymentMethods.length} saved payment method${paymentMethods.length === 1 ? '' : 's'}`
                    : 'Add a payment method to get started'
                  }
                </p>
                <Button 
                  onClick={handleAddPaymentMethod} 
                  variant="outline" 
                  size="sm"
                  className="text-xs h-8"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add New
                </Button>
              </div>
              
              {paymentMethods?.length > 0 ? (
                <div className="space-y-2">
                  {paymentMethods.map((method: any) => (
                    <Card key={method.id} className={`border overflow-hidden ${method.isDefault ? 'bg-primary/5 border-primary/20' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-md ${
                              method.card.brand === 'visa' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                              method.card.brand === 'mastercard' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                              method.card.brand === 'amex' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 
                              'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              <CreditCardIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium line-clamp-1">
                                {method.card.brand.charAt(0).toUpperCase() + method.card.brand.slice(1)} {formatCardNumber(method.card.last4)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Expires {method.card.exp_month}/{method.card.exp_year.toString().slice(-2)}
                                {method.isDefault && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm text-[10px]">
                                    Default
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {!method.isDefault && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleSetDefaultMethod(method.id)}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteMethod(method.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <CreditCardIcon className="h-10 w-10 text-primary/50 mb-3" />
                    <h3 className="text-lg font-medium mb-1">No payment methods</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add a payment method to quickly pay for services
                    </p>
                    <Button 
                      onClick={handleAddPaymentMethod} 
                      variant="default"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border-primary/10 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-0.5">Secure Payments</h3>
                      <p className="text-xs text-muted-foreground">
                        All payment information is encrypted and securely stored by Stripe.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-4 pt-2">
          {isLoadingPayments ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {payments && payments.length > 0 ? (
                <>
                  {pendingPayments.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Pending Payments</h3>
                      <div className="space-y-2">
                        {pendingPayments.map((payment: any) => (
                          <Card key={payment.id} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    <Clock className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium line-clamp-1">
                                      {payment.description || `Payment #${payment.id}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatPaymentDate(payment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <p className="font-medium">${payment.amount?.toFixed(2)}</p>
                                  <StatusBadge status={payment.status} />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Payment History</h3>
                      {payments.length > 5 && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                          View All
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {completedPayments.slice(0, 5).map((payment: any) => (
                        <Card 
                          key={payment.id} 
                          className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => handleViewPaymentDetails(payment)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  <Receipt className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium line-clamp-1">
                                    {payment.description || `Payment #${payment.id}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatPaymentDate(payment.createdAt)}
                                    {payment.jobId && (
                                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">
                                        Job #{payment.jobId}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <p className="font-medium">${payment.amount?.toFixed(2)}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {completedPayments.length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No completed payments yet
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Receipt className="h-10 w-10 text-primary/50 mb-3" />
                    <h3 className="text-lg font-medium mb-1">No payment history</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You haven't made any payments yet
                    </p>
                    {user.accountType === 'poster' && (
                      <Button 
                        onClick={() => navigate('/')} 
                        variant="default"
                      >
                        Find Jobs to Post
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Payment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-semibold">${selectedPayment.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span>{formatPaymentDate(selectedPayment.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selectedPayment.status} />
                </div>
                {selectedPayment.transactionId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <span className="text-xs font-mono">{selectedPayment.transactionId}</span>
                  </div>
                )}
                {selectedPayment.jobId && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Job ID</span>
                    <span>#{selectedPayment.jobId}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsDetailsOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  asChild
                >
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    View Receipt
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsContentV2;