import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Link } from 'lucide-react';

const FAQContent: React.FC = () => {
  const faqs = [
    {
      question: "How does payment work on The Job?",
      answer: "Payments are securely processed through Stripe Connect. When you complete a job, the payment is automatically processed from the job poster to your connected Stripe account. Workers need to set up a Stripe Connect account to receive payments, which ensures your banking details are kept secure and private."
    },
    {
      question: "What is the service fee?",
      answer: "We charge a 10% service fee on each job to cover platform costs, payment processing, and ongoing improvements. This fee is automatically calculated when a job is created and is shown transparently to both parties."
    },
    {
      question: "How do I set up my worker profile?",
      answer: "To maximize your chances of getting hired, complete your profile with a clear photo, detailed bio, and list all your relevant skills. You can edit your profile any time from the Profile tab in your account drawer."
    },
    {
      question: "Can I work on multiple jobs simultaneously?",
      answer: "Yes! You can apply for and work on as many jobs as you can handle. Just make sure you can complete all accepted jobs by their required dates."
    },
    {
      question: "What happens if a job is canceled?",
      answer: "If a job poster cancels before you've started work, no payment is processed. If cancellation happens mid-job, you may be eligible for partial payment based on completed tasks, which our support team can help arrange."
    },
    {
      question: "How are disputes handled?",
      answer: "We encourage direct communication between workers and job posters to resolve any issues. If you can't reach a resolution, contact our support team who will review the case and help mediate a fair solution."
    },
    {
      question: "What are verified skills?",
      answer: "Verified skills are abilities that have been confirmed through completed jobs and positive reviews. Having verified skills increases your visibility and credibility to potential job posters."
    },
    {
      question: "How do I get more jobs?",
      answer: "Complete your profile, maintain a high rating by delivering quality work, respond promptly to job inquiries, and build positive reviews. The more successful jobs you complete, the higher your profile will appear in search results."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we take data security very seriously. Your personal and banking information is encrypted and never shared with other users. Payment details are handled securely through Stripe, which means we never store your banking information on our servers."
    },
    {
      question: "How do reviews work?",
      answer: "After a job is completed, both parties can leave reviews. These reviews help build trust in the community. Your overall rating is calculated as an average of all reviews you've received."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center">
          <HelpCircle className="h-5 w-5 mr-2 text-primary/70" />
          Frequently Asked Questions
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-sm font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Still Have Questions?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you couldn't find the answer to your question, feel free to reach out to our support team.
          </p>
          <div className="flex items-center text-sm text-primary hover:underline">
            <Link className="h-4 w-4 mr-2" />
            <a href="mailto:support@thejob.com">Contact Support</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FAQContent;