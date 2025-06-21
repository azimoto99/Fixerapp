import React from 'react';
import { StripeTermsAcceptance } from '.';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

interface StripeRequirementsCheckProps {
  user: User | null;
  children: React.ReactNode;
}

/**
 * A component that checks if the user needs to accept Stripe terms
 * or provide representative information, and shows the appropriate dialogs.
 * 
 * This component should be used to wrap parts of the application that require
 * Stripe terms acceptance, such as job application flows or payment processing.
 */
const StripeRequirementsCheck: React.FC<StripeRequirementsCheckProps> = ({ 
  user, 
  children 
}) => {
  const [showTermsAcceptance, setShowTermsAcceptance] = React.useState(false);
  
  // Check if the user needs to accept Stripe terms, provide representative info, or banking details
  React.useEffect(() => {
    if (user && (
      user.requiresStripeTerms || 
      user.requiresStripeRepresentative || 
      user.requiresStripeBankingDetails
    )) {
      setShowTermsAcceptance(true);
    } else {
      setShowTermsAcceptance(false);
    }
  }, [user]);

  // Handle completion of terms acceptance with additional checks and logging
  const handleTermsAcceptanceComplete = () => {
    console.log('Terms acceptance complete callback triggered');
    
    // Force invalidate user query to ensure we have the latest user data
    if (user) {
      console.log('Invalidating user data after Stripe terms completion');
      // Directly query the API to re-fetch the latest user data before hiding the form
      apiRequest('GET', '/api/user')
      .then(async (response) => {
        // apiRequest already validates response.ok internally, so we can trust this response
        try {
          const userData = await response.json();
          console.log('User data refreshed successfully:', userData);
          return userData;
        } catch (jsonError) {
          console.error('Failed to parse user data response as JSON:', jsonError);
          throw new Error('Invalid JSON response from user data endpoint');
        }
      })
      .then(() => {
        console.log('Setting showTermsAcceptance to false');
        setShowTermsAcceptance(false);
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
        
        // Provide more specific error logging
        if (error.message.includes('Authentication failed')) {
          console.error('User authentication failed during data refresh');
        } else if (error.message.includes('Invalid JSON')) {
          console.error('Server returned invalid JSON response');
        }
        
        // Still hide the form even if refresh fails, as the form was already submitted successfully
        setShowTermsAcceptance(false);
      });
    } else {
      // If no user for some reason, just hide the form
      setShowTermsAcceptance(false);
    }
  };

  return (
    <>
      {showTermsAcceptance && user ? (
        <StripeTermsAcceptance 
          userId={user.id} 
          onComplete={handleTermsAcceptanceComplete} 
        />
      ) : children}
    </>
  );
};

export default StripeRequirementsCheck;