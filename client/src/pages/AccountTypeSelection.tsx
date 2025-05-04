import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BriefcaseIcon, UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

export default function AccountTypeSelection() {
  const [_, setLocation] = useLocation();
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  
  // Get query parameters from URL
  const location = typeof window !== 'undefined' ? window.location : { search: '' };
  const params = new URLSearchParams(location.search);
  const userId = params.get('id');
  const provider = params.get('provider');
  
  // If user already has an account type, redirect to home
  if (!isLoading && user?.accountType) {
    setLocation('/');
    return null;
  }
  
  // If no userId or provider is provided, redirect to login
  if (!userId || !provider) {
    toast({
      title: 'Error',
      description: 'Missing required parameters for account type selection',
      variant: 'destructive',
    });
    setLocation('/auth');
    return null;
  }
  
  const { setAccountTypeMutation } = useAuth();
  
  const handleAccountTypeSelection = async (accountType: 'worker' | 'poster') => {
    if (!userId || !provider) return;
    
    setIsPending(true);
    
    try {
      await setAccountTypeMutation.mutateAsync({
        userId: parseInt(userId),
        accountType,
        provider
      });
      
      // The mutation success handler will handle the redirect and toast
    } catch (error) {
      // The mutation error handler will handle the toast
      console.error('Failed to set account type:', error);
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Choose Your Account Type
          </h1>
          <p className="text-muted-foreground text-lg">
            Select the account type you want to use with The Job
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="overflow-hidden border-2 hover:border-primary transition-all duration-300 cursor-pointer"
                onClick={() => !isPending && handleAccountTypeSelection('worker')}>
            <CardHeader className="space-y-1 bg-muted/50">
              <CardTitle className="text-2xl flex items-center space-x-2">
                <UserIcon className="h-6 w-6 text-primary" />
                <span>Worker Account</span>
              </CardTitle>
              <CardDescription>
                Find and complete jobs in your area
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Browse jobs on interactive map</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Apply for jobs that match your skills</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Get paid securely through the platform</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Build your reputation with reviews</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-0">
              <Button
                disabled={isPending}
                className="w-full h-12 text-md"
                onClick={() => handleAccountTypeSelection('worker')}
              >
                {isPending ? 'Processing...' : 'Continue as Worker'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="overflow-hidden border-2 hover:border-primary transition-all duration-300 cursor-pointer"
                onClick={() => !isPending && handleAccountTypeSelection('poster')}>
            <CardHeader className="space-y-1 bg-muted/50">
              <CardTitle className="text-2xl flex items-center space-x-2">
                <BriefcaseIcon className="h-6 w-6 text-primary" />
                <span>Job Poster Account</span>
              </CardTitle>
              <CardDescription>
                Post jobs and hire skilled workers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Post jobs and define requirements</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Review applications from skilled workers</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Track and manage the progress of your jobs</span>
                </li>
                <li className="flex items-center">
                  <div className="rounded-full bg-primary/20 p-1 mr-2">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span>Rate and review workers after completion</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="px-6 pb-6 pt-0">
              <Button
                disabled={isPending}
                className="w-full h-12 text-md"
                onClick={() => handleAccountTypeSelection('poster')}
              >
                {isPending ? 'Processing...' : 'Continue as Job Poster'}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-8 text-center text-muted-foreground">
          <p>
            You can create both account types with the same email address. 
            <br />
            Just log in again and select the other account type.
          </p>
        </div>
      </div>
    </div>
  );
}