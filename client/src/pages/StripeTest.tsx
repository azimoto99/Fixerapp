import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { StripeTermsAcceptance } from '@/components/stripe';

export default function StripeTest() {
  const { user } = useAuth();
  const [showTermsForm, setShowTermsForm] = React.useState(false);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the Stripe test page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Test Page</CardTitle>
          <CardDescription>Test the Stripe Terms form without relying on other components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Account Type:</strong> {user.accountType}</p>
              <p><strong>Stripe Terms Accepted:</strong> {user.stripeTermsAccepted ? 'Yes' : 'No'}</p>
            </div>
            
            <Button 
              onClick={() => setShowTermsForm(true)}
              disabled={showTermsForm}
            >
              Show Stripe Terms Form
            </Button>
            
            {showTermsForm && (
              <StripeTermsAcceptance 
                userId={user.id}
                onComplete={() => setShowTermsForm(false)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}