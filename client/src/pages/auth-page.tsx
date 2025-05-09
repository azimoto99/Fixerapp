import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import Login from './Login';
import Register from './Register';
import DirectConnect from '@/components/DirectConnect';

// Define wrapper components to add onModeChange prop
const LoginWithMode = (props: any) => {
  return <Login onModeChange={props.onModeChange} />;
};

const RegisterWithMode = (props: any) => {
  return <Register onModeChange={props.onModeChange} />;
};

export default function AuthPage() {
  const [_, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // If still loading, show nothing to prevent flash
  if (isLoading) {
    return null;
  }
  
  return (
    <div className="flex min-h-screen">
      {/* DirectConnect Bar */}
      <DirectConnect />
      
      {/* Left Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        {mode === 'login' ? (
          <LoginWithMode onModeChange={() => setMode('register')} />
        ) : (
          <RegisterWithMode onModeChange={() => setMode('login')} />
        )}
      </div>
      
      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/30 to-primary flex-col items-center justify-center text-white p-12 dark:from-primary/20 dark:to-primary/80">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">Welcome to Fixer</h1>
          <p className="text-xl mb-8">
            Your one-stop platform for finding gig work opportunities or posting jobs in your local area.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Geolocation Job Matching</h3>
                <p className="text-white/80">Find jobs within a 2-mile radius of your current location</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Skill-Based Matching</h3>
                <p className="text-white/80">Get matched with the perfect jobs based on your verified skills</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Easy Payments</h3>
                <p className="text-white/80">Request payments when your earnings reach $10, with simple transaction tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}