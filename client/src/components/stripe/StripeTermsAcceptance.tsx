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
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const res = await apiRequest('POST', `/api/users/${userId}/stripe-terms`, {
        acceptTerms: values.acceptTerms,
        representativeName: values.representativeName,
        representativeTitle: values.representativeTitle,
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

            <div className="space-y-4">
              <h3 className="text-md font-medium">Representative Information</h3>
              <p className="text-sm text-gray-500">
                Please provide the name and title of the person who is authorized to accept these terms on behalf of your account.
              </p>
              
              <FormField
                control={form.control}
                name="representativeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Representative Name</FormLabel>
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
                    <FormLabel>Representative Title</FormLabel>
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