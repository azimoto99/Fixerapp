import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Briefcase, 
  Users, 
  CreditCard, 
  CheckCircle, 
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';

const JobFlowPage: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-6xl">
      <Card className="mb-8">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">How Fixer Works</CardTitle>
          <CardDescription>
            A comprehensive guide to the job creation, hiring, and payment process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center mb-8">
            <p className="text-lg text-center max-w-3xl mb-6">
              Fixer provides a secure platform for job posters to find qualified workers and for workers to find jobs and get paid seamlessly.
              All payments are processed securely through Stripe.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/jobs">
                  <Briefcase className="h-5 w-5" />
                  Browse Jobs
                </Link>
              </Button>
              
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/create-job">
                  <DollarSign className="h-5 w-5" />
                  Post a Job
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-primary" />
              Secure Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              All transactions are secured by Stripe, a PCI-compliant payment processor.
              Funds are only released when jobs are successfully completed.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Direct Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Workers receive payments directly to their bank accounts through 
              Stripe Connect, with no delays or complicated withdrawal processes.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Transparent Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Track job progress, task completion, and payment status in real-time.
              Both job posters and workers have complete visibility throughout the process.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {!user && (
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold mb-4">Ready to get started?</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/register">Create an Account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobFlowPage;