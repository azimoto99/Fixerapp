import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import JobDetail from '@/components/JobDetail';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Job } from '@shared/schema';

export default function JobDetails() {
  const [_, params] = useRoute('/job/:id');
  const { toast } = useToast();
  const jobId = params?.id ? parseInt(params.id) : undefined;

  const { data: job, isLoading, error } = useQuery<Job>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: !!jobId,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading job",
        description: "Could not load job details. Please try again.",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-card shadow rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </div>
                <Skeleton className="h-6 w-20 ml-auto" />
              </div>
              <Skeleton className="h-24 w-full mt-4" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </main>
        
        <MobileNav />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="bg-card shadow rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Job Not Found</h2>
              <p className="text-muted-foreground mb-6">The job you're looking for doesn't exist or has been removed.</p>
              <Link href="/">
                <Button>
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
        
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link href="/">
              <Button variant="ghost" className="text-primary">
                <i className="ri-arrow-left-line mr-2"></i>
                Back to Listings
              </Button>
            </Link>
          </div>
          
          <JobDetail job={job} />
          
          <div className="mt-6 bg-card shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Job Poster</h2>
            
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <i className="ri-user-line text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-medium text-foreground">User {job.posterId}</h3>
                <div className="flex items-center text-sm text-muted-foreground">
                  <i className="ri-star-fill text-yellow-400 mr-1"></i>
                  <span>4.8</span>
                  <span className="mx-1">•</span>
                  <span>24 jobs posted</span>
                </div>
              </div>
              <Button variant="outline" className="ml-auto">
                <i className="ri-message-3-line mr-2"></i>
                Contact
              </Button>
            </div>
          </div>
          
          <div className="mt-6 bg-card shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Similar Jobs</h2>
            
            <p className="text-muted-foreground text-center py-6">No similar jobs found</p>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
