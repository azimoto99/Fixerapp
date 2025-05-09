import { useEffect } from 'react';
import { useLocation } from 'wouter';
import ResetPasswordRequest from './ResetPasswordRequest';
import ResetPasswordConfirm from './ResetPasswordConfirm';

export default function ResetPassword() {
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    // Check if we have a token in the URL query parameters
    const params = new URLSearchParams(window.location.search);
    const hasToken = params.has('token');
    
    // If we're on the reset-password route without a token query, 
    // we're requesting a password reset
    // If we have a token query, we're confirming a reset
    if (location === '/reset-password') {
      if (hasToken) {
        // Show the reset password confirmation page
        return;
      }
    }
  }, [location, navigate]);

  // Check if we have a token in the URL query parameters
  const params = new URLSearchParams(window.location.search);
  const hasToken = params.has('token');
  
  // Render the appropriate component based on whether we have a token
  return hasToken ? <ResetPasswordConfirm /> : <ResetPasswordRequest />;
}