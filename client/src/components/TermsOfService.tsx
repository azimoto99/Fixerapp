import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TermsOfServiceProps {
  open: boolean;
  onClose: () => void;
}

export function TermsOfService({ open, onClose }: TermsOfServiceProps) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Last updated: May 5, 2023
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 py-4">
          <div className="space-y-6 text-sm">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
              <p>Welcome to The Job platform. These Terms of Service govern your use of our website, applications, and services. By accessing or using The Job, you agree to be bound by these Terms.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">2. Account Creation</h2>
              <p>When you create an account on The Job, you must provide accurate and complete information. You are responsible for maintaining the security of your account and password. The platform cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">3. User Conduct</h2>
              <p>You agree not to engage in any of the following prohibited activities:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Posting illegal, harmful, threatening, abusive, harassing, defamatory content</li>
                <li>Posting job listings that involve illegal activities</li>
                <li>Impersonating another person or entity</li>
                <li>Using the platform to transmit spam or malware</li>
                <li>Attempting to access other users' accounts without authorization</li>
                <li>Engaging in any activity that interferes with the proper functioning of the platform</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">4. Job Listings and Applications</h2>
              <p>Job posters must provide accurate information about the jobs they post, including fair compensation and realistic job requirements. Workers must provide accurate information about their skills and qualifications. The Job platform is not responsible for verifying the accuracy of job listings or worker qualifications.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">5. Payments and Fees</h2>
              <p>The Job collects a small service fee for facilitating transactions between job posters and workers. All payments are processed through Stripe. Users must comply with Stripe's terms of service when using the payment processing features.</p>
              <p className="mt-2">By using our platform, you agree to pay all applicable fees as they become due. Fees are non-refundable except as required by law or as explicitly stated in our refund policy.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">6. Content Filtering</h2>
              <p>The Job uses automated content filtering to detect and block inappropriate or prohibited content. We reserve the right to remove any content that violates these Terms of Service or that we determine, in our sole discretion, to be harmful or objectionable.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">7. Intellectual Property</h2>
              <p>The Job and its original content, features, and functionality are owned by The Job and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">8. Termination</h2>
              <p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">9. Limitation of Liability</h2>
              <p>In no event shall The Job, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">10. Changes to Terms</h2>
              <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold mb-2">11. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us at support@thejob.com.</p>
            </section>
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>I Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TermsOfService;