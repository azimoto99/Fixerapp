import React, { memo } from 'react';
import { Link } from 'wouter';
import { CalendarDays, Clock3, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Job } from '@shared/schema';
import { formatCurrency, formatDistance, getTimeAgo } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'outline' | 'green' | 'amber' | 'blue'> = {
  open: 'green',
  assigned: 'blue',
  in_progress: 'secondary',
  completed: 'default',
  cancelled: 'outline',
};

const JobCard: React.FC<JobCardProps> = memo(
  ({ job, isSelected, onSelect }) => {
    const distance = (job as any).distanceMiles || 0;

    const handleClick = (event: React.MouseEvent) => {
      if (!onSelect) {
        return;
      }

      event.preventDefault();
      onSelect(job);
    };

    return (
      <Link href={`/job/${job.id}`}>
        <div
          onClick={handleClick}
          className={[
            'group cursor-pointer rounded-[26px] border p-4 transition-all duration-200',
            isSelected
              ? 'border-primary/40 bg-[linear-gradient(135deg,rgba(2,132,199,0.12),rgba(251,146,60,0.08))] shadow-[0_18px_40px_rgba(3,105,161,0.18)]'
              : 'border-white/70 bg-white/78 shadow-[0_12px_28px_rgba(15,23,42,0.06)] hover:border-primary/25 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-slate-950/70',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/70">
                  {job.category}
                </Badge>
                {job.status ? (
                  <Badge variant={statusVariantMap[job.status] || 'secondary'} className="capitalize">
                    {job.status.replace('_', ' ')}
                  </Badge>
                ) : null}
              </div>

              <h3 className="mt-3 font-['Sora'] text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {job.title}
              </h3>

              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {job.description}
              </p>
            </div>

            <div className="shrink-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(2,132,199,0.16),rgba(251,146,60,0.14))] px-3 py-2 text-right shadow-[0_10px_25px_rgba(3,105,161,0.12)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Pay
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">
                {job.paymentType === 'hourly'
                  ? `${formatCurrency(job.paymentAmount)}/hr`
                  : formatCurrency(job.paymentAmount)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="truncate">
                {job.location ? job.location : distance > 0 ? formatDistance(distance) : 'Remote'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <span>{job.datePosted ? getTimeAgo(job.datePosted) : 'Just posted'}</span>
            </div>

            {job.dateNeeded ? (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>Needed by {new Date(job.dateNeeded).toLocaleDateString()}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Nearby opportunity
            </div>
            <span className="text-sm font-semibold text-primary">Open details</span>
          </div>
        </div>
      </Link>
    );
  },
  (prevProps, nextProps) =>
    prevProps.job.id === nextProps.job.id && prevProps.isSelected === nextProps.isSelected
);

export default JobCard;
