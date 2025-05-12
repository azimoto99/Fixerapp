import * as React from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Briefcase, 
  DollarSign, 
  UserCheck, 
  ClipboardCheck, 
  CheckCircle, 
  CreditCard, 
  ArrowRight, 
  BanknoteIcon 
} from 'lucide-react';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  forPoster?: boolean;
  forWorker?: boolean;
}

interface JobWorkflowGuideProps {
  userType?: 'poster' | 'worker';
}

export const JobWorkflowGuide: React.FC<JobWorkflowGuideProps> = ({ userType }) => {
  const steps: Step[] = [
    {
      title: "Post a Job",
      description: "Create a job with description, requirements, and payment details.",
      icon: <Briefcase className="h-8 w-8 text-primary" />,
      forPoster: true
    },
    {
      title: "Pay for Job",
      description: "Make a secure payment to create job listing and hire workers.",
      icon: <DollarSign className="h-8 w-8 text-green-500" />,
      forPoster: true
    },
    {
      title: "Workers Apply",
      description: "Qualified workers with Stripe Connect accounts apply for the job.",
      icon: <UserCheck className="h-8 w-8 text-blue-500" />,
      forPoster: true,
      forWorker: true
    },
    {
      title: "Select Worker",
      description: "Review applications and select the best worker for the job.",
      icon: <UserCheck className="h-8 w-8 text-indigo-500" />,
      forPoster: true
    },
    {
      title: "Complete Tasks",
      description: "Worker completes assigned tasks and marks them as done.",
      icon: <ClipboardCheck className="h-8 w-8 text-amber-500" />,
      forWorker: true
    },
    {
      title: "Mark Job Complete",
      description: "Worker confirms all tasks are complete to finalize the job.",
      icon: <CheckCircle className="h-8 w-8 text-emerald-500" />,
      forWorker: true
    },
    {
      title: "Connect Bank Account",
      description: "Worker ensures bank account is connected to receive payment.",
      icon: <BanknoteIcon className="h-8 w-8 text-green-600" />,
      forWorker: true
    },
    {
      title: "Get Paid",
      description: "Payment is transferred to worker's Stripe Connect account.",
      icon: <CreditCard className="h-8 w-8 text-success" />,
      forWorker: true
    }
  ];
  
  // Filter steps based on user type if provided
  const filteredSteps = userType 
    ? steps.filter(step => userType === 'poster' ? step.forPoster : step.forWorker)
    : steps;
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-center">How It Works</CardTitle>
        <CardDescription className="text-center">
          {userType === 'poster' 
            ? "The complete process of posting a job and hiring workers"
            : userType === 'worker'
            ? "The complete process of applying, completing jobs, and getting paid"
            : "The complete job workflow from posting to payment"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row flex-wrap justify-center gap-4">
          {filteredSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center md:w-[calc(25%-1rem)] min-w-[200px]">
              <div className="relative mb-2">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
                  {step.icon}
                </div>
                <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  {index + 1}
                </div>
                {index < filteredSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-16 w-[calc(100%+1rem)]">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <h3 className="text-center font-medium mt-2">{step.title}</h3>
              <p className="text-center text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobWorkflowGuide;