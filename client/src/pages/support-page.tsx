import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
          <CardDescription>Get help with your Fixer account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Support</h3>
            <p className="text-muted-foreground mb-4">
              Need help? We're here to assist you with any questions or issues you may have.
            </p>
            <p className="text-sm">
              Email: support@fixer.gg
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">How do I post a job?</h4>
                <p className="text-sm text-muted-foreground">
                  Navigate to the home page and click on "Post a Job" to create a new job listing.
                </p>
              </div>
              <div>
                <h4 className="font-medium">How do payments work?</h4>
                <p className="text-sm text-muted-foreground">
                  Payments are processed securely through Stripe. You'll need to set up your payment method in your profile.
                </p>
              </div>
              <div>
                <h4 className="font-medium">How do I contact a worker?</h4>
                <p className="text-sm text-muted-foreground">
                  Once you've accepted a worker for your job, you can use the contact features in the job details.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 