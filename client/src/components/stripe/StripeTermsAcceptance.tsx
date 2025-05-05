import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info, CreditCard, Map, User } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface StripeTermsAcceptanceProps {
  userId: number;
  onComplete?: () => void;
}

const formSchema = z.object({
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms of service to continue",
  }),
  representativeName: z.string().min(2, "Name must be at least 2 characters"),
  representativeTitle: z.string().min(2, "Title must be at least 2 characters"),
  // Additional fields required by Stripe
  dateOfBirth: z.string().min(10, "Date of birth is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  ssnLast4: z.string().length(4, "Last 4 digits of SSN required"),
  streetAddress: z.string().min(3, "Street address is required"),
  aptUnit: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  country: z.string().min(2, "Country is required").default("US"),
  // Bank account information
  accountType: z.enum(["checking", "savings"], {
    required_error: "Account type is required",
  }),
  accountNumber: z.string().min(4, "Valid account number is required"),
  routingNumber: z.string().length(9, "Routing number must be 9 digits"),
  accountHolderName: z.string().min(2, "Account holder name is required"),
});

type FormValues = z.infer<typeof formSchema>;

const StripeTermsAcceptance: React.FC<StripeTermsAcceptanceProps> = ({ 
  userId,
  onComplete
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('terms');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      acceptTerms: false,
      representativeName: '',
      representativeTitle: '',
      dateOfBirth: '',
      email: '',
      phone: '',
      ssnLast4: '',
      streetAddress: '',
      aptUnit: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      // Bank account defaults
      accountType: 'checking',
      accountNumber: '',
      routingNumber: '',
      accountHolderName: '',
    },
  });

  // Monitor form completion status for each section
  const termsAccepted = form.watch('acceptTerms');
  const personalInfoFilled = form.watch(['representativeName', 'representativeTitle', 'dateOfBirth', 'email', 'phone', 'ssnLast4'])
    .every(value => value && value.length > 0);
  const addressInfoFilled = form.watch(['streetAddress', 'city', 'state', 'zip'])
    .every(value => value && value.length > 0);
  const bankingInfoFilled = form.watch(['accountType', 'accountNumber', 'routingNumber', 'accountHolderName'])
    .every(value => value && value.length > 0);

  // Handle form section navigation
  const goToNextSection = () => {
    if (activeTab === 'terms') setActiveTab('personal');
    else if (activeTab === 'personal') setActiveTab('address');
    else if (activeTab === 'address') setActiveTab('banking');
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // First attempt to get the current user to ensure the session is active
      console.log('Verifying user session before form submission');
      try {
        const userRes = await apiRequest('GET', '/api/user');
        if (!userRes.ok) {
          console.error('User session check failed:', await userRes.text());
          throw new Error('User session expired. Please login again before submitting this form.');
        }
        
        // Log the user data from the session
        const userData = await userRes.clone().json();
        console.log('User session verified:', userData.id);
      } catch (sessionError) {
        console.error('Error checking user session:', sessionError);
        throw new Error('Session verification failed. Please refresh the page and try again.');
      }
      
      // Now submit the actual form data
      console.log(`Submitting form data to /api/users/${userId}/stripe-terms`);
      
      const formData = {
        // Send all form values to the API
        acceptTerms: values.acceptTerms,
        representativeName: values.representativeName,
        representativeTitle: values.representativeTitle,
        dateOfBirth: values.dateOfBirth,
        email: values.email,
        phone: values.phone,
        ssnLast4: values.ssnLast4,
        streetAddress: values.streetAddress,
        aptUnit: values.aptUnit || '',
        city: values.city,
        state: values.state,
        zip: values.zip,
        country: values.country,
        // Bank account information
        accountType: values.accountType,
        accountNumber: values.accountNumber,
        routingNumber: values.routingNumber,
        accountHolderName: values.accountHolderName,
      };
      
      // Log form data (excluding sensitive fields)
      console.log('Form data being submitted:', {
        ...formData,
        accountNumber: '****',
        routingNumber: '****',
        ssnLast4: '****'
      });
      
      try {
        const res = await apiRequest('POST', `/api/users/${userId}/stripe-terms`, formData);
        
        console.log('Form submission response status:', res.status);
        
        if (res.ok) {
          // Invalidate user queries to refresh user data
          queryClient.invalidateQueries({ queryKey: ['/api/user'] });
          
          toast({
            title: 'Setup Complete',
            description: 'Your payment account has been successfully configured.',
          });
          
          // Log the completion for debugging
          console.log('Stripe terms accepted successfully, calling onComplete callback');
          
          // Use setTimeout to ensure the UI has time to update before closing the dialog
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            }
          }, 100);
        } else {
          // Attempt to read response body
          const responseText = await res.text();
          console.error('Form submission failed:', res.status, responseText);
          
          let errorMessage = 'Failed to submit form';
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error('Could not parse error response as JSON:', e);
          }
          
          throw new Error(errorMessage);
        }
      } catch (submitError) {
        console.error('Error during form submission:', submitError);
        throw submitError;
      }
    } catch (error) {
      console.error('Error setting up payment account:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set up payment account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-primary" />
            Payment Account Setup
          </DialogTitle>
          <DialogDescription>
            Complete this form to set up your payment account and start earning.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 px-6">
            <TabsTrigger value="terms" className="text-xs sm:text-sm">
              Terms
              {termsAccepted && <span className="ml-1 text-green-500">✓</span>}
            </TabsTrigger>
            <TabsTrigger value="personal" disabled={!termsAccepted} className="text-xs sm:text-sm">
              Personal
              {personalInfoFilled && <span className="ml-1 text-green-500">✓</span>}
            </TabsTrigger>
            <TabsTrigger value="address" disabled={!termsAccepted || !personalInfoFilled} className="text-xs sm:text-sm">
              Address
              {addressInfoFilled && <span className="ml-1 text-green-500">✓</span>}
            </TabsTrigger>
            <TabsTrigger value="banking" disabled={!termsAccepted || !personalInfoFilled || !addressInfoFilled} className="text-xs sm:text-sm">
              Banking
              {bankingInfoFilled && <span className="ml-1 text-green-500">✓</span>}
            </TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <ScrollArea className="h-[400px] px-6 py-4">
                <TabsContent value="terms" className="mt-0">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <Info className="h-4 w-4 mr-2" />
                        Terms of Service
                      </CardTitle>
                      <CardDescription>
                        Review and accept the payment processing terms
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="bg-secondary/50 p-4 rounded-md text-sm max-h-40 overflow-y-auto">
                        <p className="font-medium">Stripe Services Agreement</p>
                        <p className="mt-2">
                          By accepting these terms, you agree to the 
                          <a 
                            href="https://stripe.com/legal/connect-account" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-primary hover:underline mx-1"
                          >
                            Stripe Connected Account Agreement
                          </a> 
                          which includes the 
                          <a 
                            href="https://stripe.com/legal/ssa" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-primary hover:underline mx-1"
                          >
                            Stripe Services Agreement
                          </a>.
                        </p>
                        <p className="mt-2">
                          This enables us to process payments and transfer funds to your account if you apply for and complete jobs through our platform.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>I accept Stripe's terms of service</FormLabel>
                              <FormDescription className="text-xs">
                                By checking this box, you acknowledge that you have read and agree to Stripe's Connected Account Agreement.
                              </FormDescription>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="pt-4">
                        <Button 
                          type="button" 
                          onClick={goToNextSection}
                          disabled={!termsAccepted}
                          className="w-full"
                        >
                          Next: Personal Information
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="personal" className="mt-0">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Personal Information
                      </CardTitle>
                      <CardDescription>
                        Information about you for payment processing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="representativeName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Full Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="representativeTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Individual" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="ssnLast4"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last 4 of SSN *</FormLabel>
                              <FormControl>
                                <Input 
                                  maxLength={4} 
                                  placeholder="1234" 
                                  {...field} 
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    if (value.length <= 4) {
                                      field.onChange(value);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input placeholder="email@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone *</FormLabel>
                              <FormControl>
                                <Input placeholder="(123) 456-7890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          type="button" 
                          onClick={goToNextSection}
                          disabled={!personalInfoFilled}
                          className="w-full"
                        >
                          Next: Address Information
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="address" className="mt-0">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <Map className="h-4 w-4 mr-2" />
                        Address Information
                      </CardTitle>
                      <CardDescription>
                        Your mailing address for payment verification
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="aptUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apartment/Unit (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Apt 4B" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input placeholder="New York" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <FormControl>
                                <Input placeholder="NY" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code *</FormLabel>
                              <FormControl>
                                <Input placeholder="10001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country *</FormLabel>
                              <FormControl>
                                <Input disabled value={field.value || "US"} onChange={field.onChange} name={field.name} onBlur={field.onBlur} ref={field.ref} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          type="button" 
                          onClick={goToNextSection}
                          disabled={!addressInfoFilled}
                          className="w-full"
                        >
                          Next: Banking Information
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="banking" className="mt-0">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Banking Information
                      </CardTitle>
                      <CardDescription>
                        Your bank details for receiving payments
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="accountHolderName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Holder Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="12345678" 
                                  {...field} 
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="routingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Routing Number *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="123456789" 
                                  {...field} 
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    if (value.length <= 9) {
                                      field.onChange(value);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-xs">
                        <p className="flex items-center">
                          <Info className="h-4 w-4 mr-1 text-amber-600" />
                          Your banking information is securely processed by Stripe and never stored directly on our servers.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
              
              <DialogFooter className="px-6 py-4 border-t">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !termsAccepted || !personalInfoFilled || !addressInfoFilled || !bankingInfoFilled}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up account...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StripeTermsAcceptance;