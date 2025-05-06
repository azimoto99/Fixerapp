import React from 'react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './OnboardingProvider';
import { Trash2 } from 'lucide-react';

interface ResetOnboardingProps {
  className?: string;
}

const ResetOnboarding: React.FC<ResetOnboardingProps> = ({ className }) => {
  const { resetOnboarding } = useOnboarding();

  const handleReset = () => {
    if (window.confirm('This will reset all onboarding tooltips and tours. Are you sure?')) {
      resetOnboarding();
      window.location.reload();
    }
  };

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      className={className}
      onClick={handleReset}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Reset Onboarding
    </Button>
  );
};

export default ResetOnboarding;