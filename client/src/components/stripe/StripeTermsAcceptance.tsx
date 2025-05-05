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
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
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
            </div>

            <DialogFooter>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Accept Terms and Continue'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StripeTermsAcceptance;