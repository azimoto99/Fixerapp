import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // First attempt to get the current user to ensure the session is active
      const userRes = await apiRequest('GET', '/api/user');
      if (!userRes.ok) {
        // If the user session is not valid, show an error
        throw new Error('User session expired. Please login again before submitting this form.');
      }
      
      // Now submit the actual form data with the refreshed session
      const res = await apiRequest('POST', `/api/users/${userId}/stripe-terms`, {
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
      });
      
      if (res.ok) {
        // Invalidate user queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        toast({
          title: 'Terms Accepted',
          description: 'You have successfully accepted Stripe\'s terms of service.',
        });
        
        if (onComplete) {
          onComplete();
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to accept terms');
      }
    } catch (error) {
      console.error('Error accepting Stripe terms:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept Stripe terms. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Accept Stripe Terms of Service</DialogTitle>
          <DialogDescription>
            Before you can receive or make payments through our platform, you need to accept Stripe's terms of service
            and provide representative information for your account.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md border text-sm max-h-40 overflow-y-auto">
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
                    <FormDescription>
                      By checking this box, you acknowledge that you have read and agree to Stripe's Connected Account Agreement.
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 overflow-y-auto max-h-96 pr-2">
              <h3 className="text-md font-medium">Representative Information</h3>
              <p className="text-sm text-gray-500">
                Please provide all the required information to process payments and receive payouts.
              </p>
              
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="representativeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Representative Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your full legal name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="representativeTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Representative Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Title or Position" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your title or position (e.g., Individual, Owner, CEO)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input type="date" placeholder="MM/DD/YYYY" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your date of birth
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your email address for payment notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your contact phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ssnLast4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last 4 digits of SSN *</FormLabel>
                      <FormControl>
                        <Input 
                          maxLength={4} 
                          placeholder="1234" 
                          {...field} 
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value.length <= 4) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Last 4 digits of your Social Security Number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Address Information */}
              <h3 className="text-md font-medium mt-6">Address Information</h3>
              
              <div className="grid grid-cols-1 gap-4">
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
                      <FormLabel>Apartment, Suite, Unit (Optional)</FormLabel>
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
                          <Input placeholder="US" value="US" disabled {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-md">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Privacy Note:</span> Your information is securely transmitted to Stripe and is required for identity verification, fraud prevention, and regulatory compliance.
                </p>
              </div>
              
              {/* Bank Account Information */}
              <h3 className="text-md font-medium mt-6">Bank Account Information</h3>
              <p className="text-sm text-gray-500 mb-4">
                Please provide your bank account information to receive payments.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name on the bank account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
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
                      <FormDescription>
                        Type of bank account
                      </FormDescription>
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
                          maxLength={9}
                          {...field} 
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            if (value.length <= 9) {
                              field.onChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        9-digit bank routing number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Account number" 
                          {...field} 
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Your bank account number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 pb-2 pt-4 bg-background/90 backdrop-blur-sm border-t shadow-md">
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Accept Terms and Continue'
                )}
              </Button>
              <p className="text-xs text-center mt-2 text-muted-foreground">
                You must accept the terms to use payment features
              </p>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StripeTermsAcceptance;