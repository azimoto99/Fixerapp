import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  UserIcon, 
  BriefcaseIcon, 
  Building2Icon, 
  ChevronDown, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface AccountTypeSwitcherProps {
  className?: string;
}

export default function AccountTypeSwitcher({ className = '' }: AccountTypeSwitcherProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetAccountType, setTargetAccountType] = useState<'worker' | 'poster' | 'enterprise' | null>(null);

  const accountTypeConfig = {
    worker: {
      icon: UserIcon,
      label: 'Worker',
      description: 'Find and complete jobs',
      color: 'bg-blue-500'
    },
    poster: {
      icon: BriefcaseIcon,
      label: 'Fixer',
      description: 'Post jobs and hire workers',
      color: 'bg-green-500'
    },
    enterprise: {
      icon: Building2Icon,
      label: 'Business',
      description: 'Enterprise features',
      color: 'bg-purple-500'
    }
  };

  const handleAccountTypeSwitch = async (newAccountType: 'worker' | 'poster' | 'enterprise') => {
    if (!user || newAccountType === user.accountType) return;

    setTargetAccountType(newAccountType);
    setShowConfirmDialog(true);
  };

  const confirmAccountTypeSwitch = async () => {
    if (!user || !targetAccountType) return;

    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      // Check if user already has an account of this type
      const response = await apiRequest('POST', '/api/auth/switch-account-type', {
        targetAccountType,
        createIfNotExists: true
      });

      const result = await response.json();

      if (result.success) {
        // Refresh user data
        await refreshUser();
        
        toast({
          title: 'Account type switched!',
          description: `You are now using your ${accountTypeConfig[targetAccountType].label} account.`,
        });

        // Navigate to appropriate dashboard
        switch (targetAccountType) {
          case 'worker':
            navigate('/');
            break;
          case 'poster':
            navigate('/poster-dashboard');
            break;
          case 'enterprise':
            navigate('/enterprise-dashboard');
            break;
        }
      } else {
        throw new Error(result.message || 'Failed to switch account type');
      }
    } catch (error) {
      console.error('Account type switch error:', error);
      toast({
        title: 'Switch failed',
        description: error instanceof Error ? error.message : 'Failed to switch account type',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setTargetAccountType(null);
    }
  };

  const createNewAccountType = async (accountType: 'worker' | 'poster' | 'enterprise') => {
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/create-account-type', {
        accountType,
        email: user?.email
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Account created!',
          description: `Your ${accountTypeConfig[accountType].label} account has been created.`,
        });
        
        // Switch to the new account
        await handleAccountTypeSwitch(accountType);
      } else {
        throw new Error(result.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Account creation error:', error);
      toast({
        title: 'Creation failed',
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const currentConfig = accountTypeConfig[user.accountType as keyof typeof accountTypeConfig];
  const CurrentIcon = currentConfig?.icon || UserIcon;

  return (
    <>
      <div className={className}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentConfig?.color || 'bg-gray-500'}`} />
              <CurrentIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{currentConfig?.label || 'Account'}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <CurrentIcon className="h-4 w-4" />
                Current: {currentConfig?.label}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {Object.entries(accountTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              const isCurrent = type === user.accountType;
              
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => !isCurrent && handleAccountTypeSwitch(type as any)}
                  disabled={isCurrent || isLoading}
                  className="flex items-center gap-3 p-3"
                >
                  <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{config.label}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </DropdownMenuItem>
              );
            })}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground p-3">
              <Info className="h-3 w-3 mr-2" />
              Switch between your different account types
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Switch Account Type
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to switch to your {targetAccountType && accountTypeConfig[targetAccountType].label} account?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {targetAccountType && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You'll be switched to your {accountTypeConfig[targetAccountType].label} account and redirected to the appropriate dashboard.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmAccountTypeSwitch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Switching...
                  </>
                ) : (
                  'Switch Account'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
