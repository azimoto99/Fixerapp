import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
          <CardDescription>Terms and conditions for using Fixer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Acceptance of Terms</h3>
            <p className="text-sm text-muted-foreground">
              By accessing and using Fixer, you accept and agree to be bound by the terms 
              and provision of this agreement.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Use License</h3>
            <p className="text-sm text-muted-foreground">
              Permission is granted to temporarily use Fixer for personal, non-commercial 
              transitory viewing only.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">User Accounts</h3>
            <p className="text-sm text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account 
              and password and for restricting access to your computer.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Prohibited Uses</h3>
            <p className="text-sm text-muted-foreground">
              You may not use our service for any unlawful purpose or to solicit others 
              to perform unlawful acts.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Payments</h3>
            <p className="text-sm text-muted-foreground">
              All payments are processed through our secure payment system. 
              You agree to pay all charges incurred by you or any users of your account.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
            <p className="text-sm text-muted-foreground">
              If you have any questions about these Terms, please contact us at legal@fixer.gg
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 