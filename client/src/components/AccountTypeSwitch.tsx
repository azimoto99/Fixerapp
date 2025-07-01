import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const AccountTypeSwitch = () => {
  const { user, setAccountTypeMutation } = useAuth();
  const [accountType, setAccountType] = useState<'worker' | 'poster'>(user?.accountType as 'worker' | 'poster' || 'worker');

  useEffect(() => {
    if (user) {
      setAccountType(user.accountType as 'worker' | 'poster');
    }
  }, [user]);

  const handleWorkerClick = () => {
    setAccountType('worker');
    if (user) {
      setAccountTypeMutation.mutate({
        userId: user.id,
        accountType: 'worker',
        provider: 'manual'
      });
    }
  };

  const handlePosterClick = () => {
    setAccountType('poster');
    if (user) {
      setAccountTypeMutation.mutate({
        userId: user.id,
        accountType: 'poster',
        provider: 'manual'
      });
    }
  };

  return (
    <div className="px-4 sm:px-0 mb-4">
      <div className="inline-flex rounded-md shadow-sm">
        <Button
          type="button"
          variant="tab"
          className={`rounded-l-md ${
            accountType === 'worker'
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border bg-background text-foreground hover:bg-accent'
          }`}
          onClick={handleWorkerClick}
        >
          <i className="ri-user-line mr-2"></i>
          Worker Mode
        </Button>
        <Button
          type="button"
          variant="tab"
          className={`rounded-r-md ${
            accountType === 'poster'
              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
              : 'border-border bg-background text-foreground hover:bg-accent'
          }`}
          onClick={handlePosterClick}
        >
          <i className="ri-briefcase-line mr-2"></i>
          Fixer Mode
        </Button>
      </div>
    </div>
  );
};

export default AccountTypeSwitch;
