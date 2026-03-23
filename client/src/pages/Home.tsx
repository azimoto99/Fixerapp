import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, BriefcaseBusiness, Clock3, MapPin, MessageSquareMore, Sparkles, Wallet } from 'lucide-react';
import Header from '@/components/Header';
import JobSearch from '@/components/JobSearch';
import JobListSection from '@/components/JobListSection';
import MapSection from '@/components/MapSection';
import NewJobButton from '@/components/NewJobButton';
import PostJobDrawer from '@/components/PostJobDrawer';
import { MessagingDrawer } from '@/components/MessagingDrawer';
import { useJobs } from '@/hooks/useJobs';
import { Job } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SearchState {
  query: string;
  category: string;
  searchMode: 'location' | 'description';
  coordinates?: { latitude: number; longitude: number };
  radiusMiles?: number;
}

function SummaryTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/76 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/68">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-['Sora'] text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function WorkerDashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | undefined>(undefined);
  const [searchParams, setSearchParams] = useState<SearchState>({
    query: '',
    category: '',
    searchMode: 'location',
    radiusMiles: 10,
  });

  const { jobs = [] } = useJobs(
    {
      nearbyOnly: true,
      radiusMiles: searchParams.radiusMiles ?? 10,
      poster: false,
    },
    searchParams
  );

  const availableJobs = jobs.length;
  const categoryCount = new Set(jobs.map((job) => job.category)).size;

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="panel-stack">
        <Card className="surface-strong">
          <CardHeader>
            <Badge variant="outline" className="w-fit bg-background/70">
              Worker command center
            </Badge>
            <CardTitle className="hero-gradient-text text-3xl sm:text-4xl">
              Find better local work without the clutter.
            </CardTitle>
            <CardDescription>
              Search by neighborhood or skill, keep the live map visible, and move from browsing to applying with less
              friction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <JobSearch
              onSearch={(params) =>
                setSearchParams({
                  query: params.query,
                  category: params.category,
                  searchMode: params.searchMode || 'location',
                  coordinates: params.coordinates,
                  radiusMiles: params.radiusMiles ?? 10,
                })
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SummaryTile
                label="Open jobs"
                value={String(availableJobs)}
                detail="Live results in your current search view"
                icon={BriefcaseBusiness}
              />
              <SummaryTile
                label="Categories"
                value={String(categoryCount || 0)}
                detail="Different types of work available nearby"
                icon={Sparkles}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="stat-pill">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{searchParams.radiusMiles ?? 10} mile search radius</span>
              </div>
              <div className="stat-pill">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>{searchParams.searchMode === 'location' ? 'Map-first browsing' : 'Keyword ranked browsing'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="hidden xl:block">
          <JobListSection
            mode="worker"
            searchParams={searchParams}
            selectedJobId={selectedJob?.id}
            onSelectJob={setSelectedJob}
          />
        </div>
      </aside>

      <section className="panel-stack">
        <div className="surface-strong overflow-hidden p-2">
          <MapSection
            jobs={jobs}
            selectedJob={selectedJob}
            onSelectJob={setSelectedJob}
            searchCoordinates={searchParams.coordinates}
          />
        </div>

        <div className="xl:hidden">
          <JobListSection
            mode="worker"
            searchParams={searchParams}
            selectedJobId={selectedJob?.id}
            onSelectJob={setSelectedJob}
          />
        </div>
      </section>

      <NewJobButton />
    </div>
  );
}

function PosterDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { jobs = [], isLoading } = useJobs({ poster: true, includeAll: true });
  const [isJobDrawerOpen, setIsJobDrawerOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<Job | null>(null);

  const openJobs = jobs.filter((job) => job.status === 'open').length;
  const activeJobs = jobs.filter((job) => job.status === 'assigned' || job.status === 'in_progress').length;
  const completedJobs = jobs.filter((job) => job.status === 'completed').length;
  const totalValue = jobs.reduce((sum, job) => sum + (job.paymentAmount || 0), 0);

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel the job.');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Job cancelled',
        description: 'The job was cancelled and your dashboard is now up to date.',
      });
      setJobToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Unable to cancel job',
        description: error.message,
        variant: 'destructive',
      });
      setJobToCancel(null);
    },
  });

  return (
    <div className="panel-stack">
      <PostJobDrawer isOpen={isJobDrawerOpen} onOpenChange={setIsJobDrawerOpen} />

      <Card className="surface-strong">
        <CardHeader className="page-header">
          <div>
            <Badge variant="outline" className="w-fit bg-background/70">
              Poster command center
            </Badge>
            <CardTitle className="hero-gradient-text mt-3 text-3xl sm:text-4xl">
              Hire faster, track everything, and keep jobs moving.
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl">
              Your jobs, statuses, and value are visible at a glance so it is easier to manage demand from desktop or
              your phone.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsJobDrawerOpen(true)}>Create a new job</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="Open" value={String(openJobs)} detail="Ready for applicants" icon={BriefcaseBusiness} />
          <SummaryTile label="Active" value={String(activeJobs)} detail="Assigned or in progress" icon={Clock3} />
          <SummaryTile label="Completed" value={String(completedJobs)} detail="Finished jobs on the platform" icon={Sparkles} />
          <SummaryTile
            label="Posted value"
            value={`$${totalValue.toFixed(0)}`}
            detail="Combined listed payout value"
            icon={Wallet}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="surface-panel h-52" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="surface-panel">
          <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
              <BriefcaseBusiness className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-['Sora'] text-2xl font-semibold tracking-tight text-foreground">
              No jobs posted yet
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Build your first listing with a clearer layout, structured payment setup, and space for the details workers
              actually need.
            </p>
            <Button className="mt-6" onClick={() => setIsJobDrawerOpen(true)}>
              Post your first job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id} className="surface-panel">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{job.category}</Badge>
                      <Badge variant="secondary" className="capitalize">
                        {job.status}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 text-xl">{job.title}</CardTitle>
                  </div>
                  <div className="rounded-[18px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] px-3 py-2 text-sm font-semibold text-foreground">
                    ${job.paymentAmount?.toFixed(0)}
                  </div>
                </div>
                <CardDescription>{job.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <span>Posted {job.datePosted ? new Date(job.datePosted).toLocaleDateString() : 'recently'}</span>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('open-job-details', {
                          detail: { jobId: job.id },
                        })
                      );
                    }}
                  >
                    Manage
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => setJobToCancel(job)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!jobToCancel} onOpenChange={(open) => !open && setJobToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this job?</AlertDialogTitle>
            <AlertDialogDescription>
              {jobToCancel
                ? `This will mark "${jobToCancel.title}" as cancelled and remove it from your active workflow.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep job active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (jobToCancel) {
                  cancelJobMutation.mutate(jobToCancel.id);
                }
              }}
            >
              Cancel job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'worker' | 'poster'>('worker');
  const [showPostedJobs, setShowPostedJobs] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);

  const { jobs: postedJobs = [] } = useJobs({ poster: true, includeAll: true });

  const { data: realtimePostedJobs = [] } = useQuery({
    queryKey: ['/api/jobs', 'poster-realtime', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const response = await fetch(`/api/jobs?posterId=${user.id}`);
      if (!response.ok) {
        return [];
      }

      return response.json();
    },
    enabled: showPostedJobs && !!user,
    refetchInterval: showPostedJobs ? 3000 : false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (user?.accountType === 'poster') {
      setSelectedRole('poster');
    }
  }, [user?.accountType]);

  const finalPostedJobs = useMemo(
    () => (showPostedJobs && realtimePostedJobs.length ? realtimePostedJobs : postedJobs),
    [postedJobs, realtimePostedJobs, showPostedJobs]
  );

  const roleHeadline =
    selectedRole === 'worker'
      ? 'A faster way to discover the best local work near you.'
      : 'A calmer, more capable hiring workflow for every job you post.';

  return (
    <div className="min-h-screen">
      <Header
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onTogglePostedJobs={() => setShowPostedJobs(true)}
        onToggleMessaging={() => setShowMessaging(true)}
        postedJobsCount={finalPostedJobs.length}
      />

      <main className="page-shell panel-stack">
        <Card className="surface-strong overflow-hidden">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:p-8">
            <div>
              <Badge variant="outline" className="w-fit bg-background/70">
                Redesigned dashboard
              </Badge>
              <h1 className="hero-gradient-text mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                {roleHeadline}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                The experience is now organized around the tasks people actually do most: discovering work, posting
                jobs, checking movement, and getting back into the right flow quickly on phone or desktop.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <SummaryTile
                label="Posted jobs"
                value={String(finalPostedJobs.length)}
                detail="Listings visible in your quick access drawer"
                icon={BriefcaseBusiness}
              />
              <SummaryTile
                label="Messages"
                value={showMessaging ? 'Open' : 'Ready'}
                detail="Reach workers and posters from the same dashboard"
                icon={MessageSquareMore}
              />
            </div>
          </CardContent>
        </Card>

        {selectedRole === 'worker' ? <WorkerDashboard /> : <PosterDashboard />}
      </main>

      <MessagingDrawer open={showMessaging} onOpenChange={setShowMessaging} />

      <Sheet open={showPostedJobs} onOpenChange={setShowPostedJobs}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>My jobs</SheetTitle>
            <SheetDescription>
              A quick management drawer for the jobs you have already posted.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3 overflow-y-auto pr-1">
            {finalPostedJobs.length > 0 ? (
              finalPostedJobs.map((job: any) => (
                <div
                  key={job.id}
                  className="rounded-[24px] border border-white/70 bg-white/76 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/68"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{job.category}</Badge>
                        <Badge variant="secondary" className="capitalize">
                          {job.status}
                        </Badge>
                      </div>
                      <h3 className="mt-3 font-['Sora'] text-lg font-semibold tracking-tight text-foreground">
                        {job.title}
                      </h3>
                    </div>
                    <div className="rounded-[18px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] px-3 py-2 text-sm font-semibold">
                      ${job.paymentAmount?.toFixed(0)}
                    </div>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{job.description}</p>

                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{job.location}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('open-job-details', {
                            detail: { jobId: job.id },
                          })
                        )
                      }
                    >
                      View details
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/jobs/${job.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: 'cancelled' }),
                          });

                          if (response.ok) {
                            window.dispatchEvent(new CustomEvent('job-updated'));
                          }
                        } catch (error) {
                          console.error('Error cancelling job:', error);
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-border bg-foreground/[0.03] px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
                  <BriefcaseBusiness className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-['Sora'] text-xl font-semibold tracking-tight text-foreground">
                  Nothing posted yet
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Create your first job and it will show up here for quick access.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
