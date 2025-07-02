import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import Login from './Login';
import Register from './Register';
import { Building2, Briefcase, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define wrapper components to add onModeChange prop
const LoginWithMode = (props: any) => {
  return <Login onModeChange={props.onModeChange} />;
};

const RegisterWithMode = (props: any) => {
  return <Register onModeChange={props.onModeChange} accountType={props.accountType} />;
};

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [accountType, setAccountType] = useState<'worker' | 'poster' | 'enterprise'>('worker');
  
  // Check if coming from enterprise signup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'enterprise') {
      setAccountType('enterprise');
      setMode('register');
    }
  }, []);
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // If still loading, show a proper loading indicator
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Account Type Selector for Registration */}
          {mode === 'register' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">I want to:</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={accountType === 'worker' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAccountType('worker')}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <User className="h-4 w-4" />
                  <span className="text-xs">Find Work</span>
                </Button>
                <Button
                  variant={accountType === 'poster' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAccountType('poster')}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="text-xs">Post Jobs</span>
                </Button>
                <Button
                  variant={accountType === 'enterprise' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAccountType('enterprise')}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Business</span>
                </Button>
              </div>
              {accountType === 'enterprise' && (
                <div className="mt-3 p-3 bg-primary/10 rounded-lg text-sm">
                  <p className="font-medium text-primary mb-1">Enterprise Account Benefits:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Featured hub pins on the map</li>
                    <li>• Manage multiple job positions</li>
                    <li>• Advanced analytics dashboard</li>
                    <li>• Team management features</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {mode === 'login' ? (
            <LoginWithMode onModeChange={() => setMode('register')} accountType={accountType} />
          ) : (
            <RegisterWithMode onModeChange={() => setMode('login')} accountType={accountType} />
          )}
        </div>
      </div>
      
      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/30 to-primary flex-col items-center justify-center text-white p-12 dark:from-primary/20 dark:to-primary/80">
        <div className="max-w-md">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white">Welcome to Fixer</h1>
            {accountType === 'enterprise' && (
              <p className="text-xl text-white/90 mt-2">Enterprise Solutions</p>
            )}
          </div>
          <p className="text-xl mb-8">
            {accountType === 'enterprise' 
              ? 'Scale your hiring with our enterprise features designed for businesses.'
              : 'The ultimate platform connecting skilled workers with local job opportunities.'}
          </p>
          
          <div className="space-y-4">
            {accountType === 'enterprise' ? (
              <>
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded mr-4">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Featured Business Presence</h3>
                    <p className="text-white/80">Stand out with premium hub pins that showcase your business and open positions</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Team Management</h3>
                    <p className="text-white/80">Add team members and manage hiring across your organization</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Advanced Analytics</h3>
                    <p className="text-white/80">Track applications, hiring metrics, and workforce insights</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Smart Location Matching</h3>
                    <p className="text-white/80">Connect with nearby opportunities using our intelligent location-based system</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Professional Growth</h3>
                    <p className="text-white/80">Build your reputation with verified skills and grow your career</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-white/20 p-2 rounded mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Secure Payments</h3>
                    <p className="text-white/80">Receive payments through our trusted payment system with clear tracking</p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {mode === 'login' && (
            <div className="mt-8 pt-8 border-t border-white/20">
              <p className="text-white/80 mb-3">Are you a business looking to scale your hiring?</p>
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => {
                  setAccountType('enterprise');
                  setMode('register');
                }}
              >
                <Building2 className="h-4 w-4" />
                Create Business Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}