import * as React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Briefcase,
  Users,
  CheckCircle,
  DollarSign,
  Clock,
  Building,
  ArrowRight,
  Clipboard,
  Wallet,
  BanknoteIcon
} from 'lucide-react';

interface JobFlowGuideProps {
  userType?: 'poster' | 'worker'; // Optionally filter content for specific user types
}

/**
 * A comprehensive guide to the job and payment flow
 * Shows the entire process from job creation to payment
 */
export function JobFlowGuide({ userType }: JobFlowGuideProps) {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-xl text-center">Complete Job Payment Flow</CardTitle>
        <CardDescription className="text-center">
          Understanding the end-to-end process for job creation, hiring, and payment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={userType || "all"}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">Complete Flow</TabsTrigger>
            <TabsTrigger value="poster">For Job Posters</TabsTrigger>
            <TabsTrigger value="worker">For Workers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-8 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
                <Briefcase className="h-10 w-10 mb-4 text-primary" />
                <h3 className="font-semibold text-center">Post a Job</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Job poster creates listing with description and payment amount
                </p>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
                <DollarSign className="h-10 w-10 mb-4 text-green-500" />
                <h3 className="font-semibold text-center">Job Payment</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Job poster secures funds to create active listing
                </p>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</div>
                <Users className="h-10 w-10 mb-4 text-blue-500" />
                <h3 className="font-semibold text-center">Worker Applications</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Workers with Stripe Connect accounts apply for the job
                </p>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">4</div>
                <CheckCircle className="h-10 w-10 mb-4 text-indigo-500" />
                <h3 className="font-semibold text-center">Worker Selection</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Job poster reviews applications and selects a worker
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">5</div>
                <Clipboard className="h-10 w-10 mb-4 text-amber-500" />
                <h3 className="font-semibold text-center">Complete Tasks</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Worker completes assigned tasks for the job
                </p>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">6</div>
                <CheckCircle className="h-10 w-10 mb-4 text-emerald-500" />
                <h3 className="font-semibold text-center">Mark Job Complete</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Worker confirms all tasks are complete
                </p>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">7</div>
                <BanknoteIcon className="h-10 w-10 mb-4 text-green-600" />
                <h3 className="font-semibold text-center">Connect Bank Account</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Worker ensures bank account is set up to receive payment
                </p>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden md:block">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="relative flex flex-col items-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">8</div>
                <Wallet className="h-10 w-10 mb-4 text-success" />
                <h3 className="font-semibold text-center">Payment Transfer</h3>
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Funds transferred to worker's Stripe Connect account
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="poster" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <Briefcase className="h-8 w-8 mr-3 text-primary" />
                  <div>
                    <h3 className="font-semibold">1. Create a Job Listing</h3>
                    <p className="text-sm text-muted-foreground">Describe the work needed and set payment details</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Complete the job posting form with detailed description</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Set either fixed price or hourly rate payment</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Add required skills and job category</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <DollarSign className="h-8 w-8 mr-3 text-green-500" />
                  <div>
                    <h3 className="font-semibold">2. Pay for the Job</h3>
                    <p className="text-sm text-muted-foreground">Secure payment through Stripe to create listing</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Enter credit card details or use saved payment method</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Funds are held securely until job completion</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Receipt provided for your records</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <Users className="h-8 w-8 mr-3 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">3. Review Applications</h3>
                    <p className="text-sm text-muted-foreground">Evaluate worker applications and select the best fit</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>View worker profiles, reviews, and ratings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Compare worker proposals and rates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Message workers with questions before hiring</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <CheckCircle className="h-8 w-8 mr-3 text-emerald-500" />
                  <div>
                    <h3 className="font-semibold">4. Manage Job Completion</h3>
                    <p className="text-sm text-muted-foreground">Track progress and approve completion</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Monitor task completion in real-time</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Automatic payment processing when job is completed</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Leave a review for the worker after completion</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="worker" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <CreditCard className="h-8 w-8 mr-3 text-primary" />
                  <div>
                    <h3 className="font-semibold">1. Set Up Stripe Connect</h3>
                    <p className="text-sm text-muted-foreground">Create your payment account to receive funds</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Complete Stripe Connect onboarding process</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Verify your identity with required documents</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Add bank account for payouts</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <Briefcase className="h-8 w-8 mr-3 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">2. Apply for Jobs</h3>
                    <p className="text-sm text-muted-foreground">Find and apply to jobs matching your skills</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Browse available jobs in your area</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Submit application with your hourly rate and proposal</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Track your application status</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <Clipboard className="h-8 w-8 mr-3 text-amber-500" />
                  <div>
                    <h3 className="font-semibold">3. Complete Job Tasks</h3>
                    <p className="text-sm text-muted-foreground">Work on and track progress of assigned tasks</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Review job requirements and task list</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Mark tasks as complete as you work</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Communicate with job poster about progress</span>
                  </li>
                </ul>
              </div>
              
              <div className="flex flex-col p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center mb-4">
                  <Wallet className="h-8 w-8 mr-3 text-success" />
                  <div>
                    <h3 className="font-semibold">4. Get Paid</h3>
                    <p className="text-sm text-muted-foreground">Receive payment directly to your bank account</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm ml-11">
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Mark job as complete when all tasks are done</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Payment automatically sent to your Stripe Connect account</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                    <span>Access earnings dashboard to track all payments</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-center text-muted-foreground max-w-xl">
          This secure payment system ensures both job posters and workers are protected. 
          Funds are only released when jobs are successfully completed, and all payments are processed through Stripe's secure payment system.
        </p>
      </CardFooter>
    </Card>
  );
}

export default JobFlowGuide;