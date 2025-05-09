import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  ChevronRight, 
  Briefcase, 
  MapPin, 
  CreditCard, 
  Star, 
  CheckCircle2 
} from 'lucide-react';

const WelcomeMessage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  
  useEffect(() => {
    // Check if the welcome message has been shown before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    
    if (!hasSeenWelcome) {
      // Show the welcome message after a short delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const handleClose = () => {
    // Mark that the user has seen the welcome message
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsOpen(false);
  };
  
  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center">
                <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">1</span>
                Welcome to Fixer!
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Your one-stop platform for finding and posting local gigs. Let's take a quick tour to help you get started.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <img 
                src="/welcome-image.svg" 
                alt="Welcome" 
                className="w-full max-w-md mx-auto h-48 object-contain opacity-90"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }} 
              />
              <div className="text-center mt-4 text-muted-foreground">
                Connect with local work opportunities in your community
              </div>
            </div>
          </>
        );
      
      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center">
                <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">2</span>
                Find Jobs Near You
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Discover opportunities right in your neighborhood with our interactive map.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg border p-4 flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Location-Based Matching</h4>
                  <p className="text-sm text-muted-foreground">
                    Our geolocation technology shows you jobs that are closest to you first, saving you time and travel.
                  </p>
                </div>
              </div>
              
              <div className="rounded-lg border p-4 flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Diverse Opportunities</h4>
                  <p className="text-sm text-muted-foreground">
                    From home repairs to pet sitting, find the perfect job that matches your skills and schedule.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      
      case 3:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center">
                <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">3</span>
                Secure Payments
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Get paid quickly and securely through our integrated Stripe Connect system.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg border p-4 flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Easy Setup</h4>
                  <p className="text-sm text-muted-foreground">
                    Set up your Stripe Connect account once, and receive payments directly to your bank account for every job completed.
                  </p>
                </div>
              </div>
              
              <div className="rounded-lg border p-4 flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Transparent Fees</h4>
                  <p className="text-sm text-muted-foreground">
                    Know exactly what you'll earn with our transparent pricing structure and low platform fee.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      
      case 4:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center">
                <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center mr-2 text-sm">4</span>
                Build Your Reputation
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Earn great reviews and showcase your skills to stand out from the crowd.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg border p-4 flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Ratings & Reviews</h4>
                  <p className="text-sm text-muted-foreground">
                    Build trust with potential clients through honest reviews and ratings from previous jobs.
                  </p>
                </div>
              </div>
              
              <div className="rounded-lg border p-4 flex items-start space-x-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Verified Skills</h4>
                  <p className="text-sm text-muted-foreground">
                    Get your skills verified based on your performance to increase your chances of being hired.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      
      case 5:
        return (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-center">
                You're All Set!
              </DialogTitle>
              <DialogDescription className="text-base pt-2 text-center">
                Start exploring jobs or post your own gig today.
              </DialogDescription>
            </DialogHeader>
            <div className="py-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <p className="text-center text-muted-foreground mb-6">
                Thank you for joining the Fixer community. We're excited to help you find opportunities and grow your career.
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <Card className="border border-primary/20 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Find Work</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">
                      Discover local gigs that match your skills
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border border-primary/20 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">Post a Job</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground">
                      Find qualified workers for your tasks
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="p-6">
          {renderStepContent()}
        </div>
        
        <DialogFooter className="bg-muted/30 px-6 py-4 flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex items-center">
            <div className="text-sm text-muted-foreground mr-4">
              {step} of {totalSteps}
            </div>
            <Button onClick={handleNext}>
              {step < totalSteps ? (
                <>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                'Get Started'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeMessage;