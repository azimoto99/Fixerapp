import { useCallback, useMemo } from 'react';
import { BriefcaseBusiness, Sparkles } from 'lucide-react';
import { Job } from '@shared/schema';
import JobCard from './JobCard';
import { useJobs } from '@/hooks/useJobs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface JobListSectionProps {
  mode?: 'worker' | 'poster';
  onSelectJob?: (job: Job) => void;
  selectedJobId?: number;
  searchParams?: {
    query?: string;
    category?: string;
    searchMode?: 'location' | 'description';
    coordinates?: { latitude: number; longitude: number };
    radiusMiles?: number;
  };
}

const JobListSection: React.FC<JobListSectionProps> = ({
  mode = 'worker',
  onSelectJob,
  selectedJobId,
  searchParams,
}) => {
  const { jobs, isLoading } = useJobs(
    {
      nearbyOnly: mode === 'worker',
      radiusMiles: searchParams?.radiusMiles ?? 10,
      poster: mode === 'poster',
      includeAll: mode === 'poster',
    },
    searchParams
  );

  const filteredJobs = useMemo(() => jobs || [], [jobs]);

  const handleSelectJob = useCallback(
    (job: Job) => {
      onSelectJob?.(job);
    },
    [onSelectJob]
  );

  if (isLoading) {
    return (
      <div className="surface-panel overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="space-y-3 p-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {mode === 'worker' ? 'Open opportunities' : 'Posted jobs'}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="font-['Sora'] text-lg font-semibold tracking-tight text-foreground">
              {mode === 'worker' ? 'Work that fits your day' : 'Everything you are managing'}
            </h2>
            <Badge variant="outline">{filteredJobs.length}</Badge>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full bg-foreground/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:flex">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Live results
        </div>
      </div>

      <ScrollArea className="max-h-[640px]">
        <div className="space-y-3 p-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={job.id === selectedJobId}
                onSelect={handleSelectJob}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-foreground/[0.03] px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] text-primary">
                <BriefcaseBusiness className="h-7 w-7" />
              </div>
              <h3 className="mt-5 font-['Sora'] text-xl font-semibold tracking-tight text-foreground">
                No jobs match this view yet
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Try a different search area, clear a category filter, or widen the search radius to surface more
                options.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default JobListSection;
