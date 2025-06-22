import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>About Fixer</CardTitle>
          <CardDescription>Connecting people with skilled workers for all your needs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Our Mission</h3>
            <p className="text-sm text-muted-foreground">
              Fixer is a platform that connects people who need work done with skilled workers 
              in their area. We make it easy to find reliable help for any task, big or small.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">How It Works</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>1. Post a Job:</strong> Describe what you need done and set your budget.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>2. Get Applications:</strong> Skilled workers in your area will apply for your job.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>3. Choose Your Worker:</strong> Review applications and select the best fit.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>4. Get It Done:</strong> Work with your chosen worker to complete the job.
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Why Choose Fixer?</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Verified workers with ratings and reviews</li>
              <li>Secure payment processing</li>
              <li>24/7 customer support</li>
              <li>Easy-to-use mobile and web platform</li>
              <li>Competitive pricing</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
            <p className="text-sm text-muted-foreground">
              Have questions or feedback? We'd love to hear from you at hello@fixer.gg
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 