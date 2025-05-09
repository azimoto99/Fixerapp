import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof formSchema>;

export default function ResetPasswordRequest() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/password-reset/request', data);
      if (response.ok) {
        setSubmitted(true);
        toast({
          title: 'Password reset initiated',
          description: 'If an account exists with that email, you will receive a reset link.',
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'An error occurred. Please try again.');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            className="flex items-center text-sm" 
            onClick={() => navigate('/auth')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {!submitted 
                ? 'Enter your email address to receive a password reset link' 
                : 'Check your email for a reset link'
              }
            </CardDescription>
          </CardHeader>
          
          {!submitted ? (
            <>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Send Reset Link'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <CardContent className="space-y-4">
              <div className="text-center p-4">
                <div className="bg-green-100 dark:bg-green-900 rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  If we found an account with that email address, we've sent instructions to reset your password.
                  Please check your email.
                </p>
                <Button onClick={() => navigate('/auth')} className="mt-2">
                  Return to Login
                </Button>
              </div>
            </CardContent>
          )}
          
          {!submitted && (
            <CardFooter className="flex justify-center">
              <p className="text-sm text-gray-500">
                Remember your password?{' '}
                <span 
                  className="text-primary-600 hover:text-primary-500 cursor-pointer"
                  onClick={() => navigate('/auth')}
                >
                  Log in
                </span>
              </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}