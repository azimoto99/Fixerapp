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
                  onClick={() => window.location.href = '/auth/google?accountType=' + form.watch('accountType')}
                  disabled={loginMutation.isPending}
                  className="flex items-center justify-center"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                    </g>
                  </svg>
                  Google
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => window.location.href = '/auth/facebook?accountType=' + form.watch('accountType')}
                  disabled={loginMutation.isPending}
                  className="flex items-center justify-center"
                >
                  <svg className="h-5 w-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C15.9 21.59 18.03 20.42 19.57 18.66C21.1 16.89 21.93 14.63 21.93 12.31C21.93 6.58 17.44 2.04 12 2.04Z"/>
                  </svg>
                  Facebook
                </Button>
              </div>
              
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or try a demo account</span>
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
