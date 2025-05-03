import { useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  accountType: z.enum(['worker', 'poster']),
});

type FormData = z.infer<typeof formSchema>;

export default function Login() {
  const [_, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
      accountType: 'worker',
    },
  });

  async function onSubmit(data: FormData) {
    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate('/');
      }
    });
  }

  // Sample login functionality
  const handleDemoLogin = (accountType: 'worker' | 'poster') => {
    // Hardcoded demo credentials
    const username = accountType === 'worker' ? 'worker1' : 'poster1';
    
    form.setValue('username', username);
    form.setValue('password', 'password123');
    form.setValue('accountType', accountType);
    
    // Submit the form
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/">
            <a className="inline-flex items-center">
              <svg className="h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-2xl font-bold text-primary-600">GigConnect</span>
            </a>
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Log In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <div className="flex space-x-4">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="worker"
                            value="worker"
                            checked={field.value === 'worker'}
                            onChange={() => field.onChange('worker')}
                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <label htmlFor="worker" className="ml-2 block text-sm text-gray-700">
                            Worker
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="poster"
                            value="poster"
                            checked={field.value === 'poster'}
                            onChange={() => field.onChange('poster')}
                            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                          />
                          <label htmlFor="poster" className="ml-2 block text-sm text-gray-700">
                            Job Poster
                          </label>
                        </div>
                      </div>
                      <FormDescription>
                        Select the account type you want to use for this login
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? 'Logging in...' : 'Log In'}
                </Button>
              </form>
            </Form>
            
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDemoLogin('worker')}
                  disabled={loginMutation.isPending}
                >
                  <i className="ri-user-line mr-2"></i>
                  Demo Worker
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDemoLogin('poster')}
                  disabled={loginMutation.isPending}
                >
                  <i className="ri-briefcase-line mr-2"></i>
                  Demo Poster
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register">
                <a className="font-medium text-primary-600 hover:text-primary-500">
                  Sign up
                </a>
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
