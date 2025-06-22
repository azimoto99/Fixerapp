import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
          <CardDescription>How we collect, use, and protect your information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Information We Collect</h3>
            <p className="text-sm text-muted-foreground">
              We collect information you provide directly to us, such as when you create an account, 
              post a job, or contact us for support.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">How We Use Your Information</h3>
            <p className="text-sm text-muted-foreground">
              We use the information we collect to provide, maintain, and improve our services, 
              process transactions, and communicate with you.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Information Sharing</h3>
            <p className="text-sm text-muted-foreground">
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              without your consent, except as described in this policy.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Data Security</h3>
            <p className="text-sm text-muted-foreground">
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
            <p className="text-sm text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at privacy@fixer.gg
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 