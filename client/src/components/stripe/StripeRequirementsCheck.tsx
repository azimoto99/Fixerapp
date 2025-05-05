import React from 'react';
import { StripeTermsAcceptance } from '.';
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
  
  // Check if the user needs to accept Stripe terms or provide representative info
  React.useEffect(() => {
    if (user && (user.requiresStripeTerms || user.requiresStripeRepresentative)) {
      setShowTermsAcceptance(true);
    } else {
      setShowTermsAcceptance(false);
    }
  }, [user]);

  // Handle completion of terms acceptance
  const handleTermsAcceptanceComplete = () => {
    setShowTermsAcceptance(false);
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