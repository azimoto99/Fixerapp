import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { withAuth } from '@/lib/with-auth';
import SavedPaymentMethodManager from '@/components/payments/SavedPaymentMethodManager';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { CreditCard, ChevronLeft } from 'lucide-react';
import { useLocation } from 'wouter';

function PaymentMethodsPage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  return (
    <PageContainer>
      <PageHeader 
        title="Payment Methods" 
        description="Manage your payment methods for jobs and services"
        icon={<CreditCard />}
        actions={
          <Button variant="outline" onClick={() => navigate('/profile')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        }
      />
      
      <div className="mt-6">
        <SavedPaymentMethodManager />
      </div>
    </PageContainer>
  );
}

export default withAuth(PaymentMethodsPage);