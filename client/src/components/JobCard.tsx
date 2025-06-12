import React, { memo } from 'react';
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon, getCategoryColor, formatCurrency, formatDistance, getTimeAgo } from "@/lib/utils";
import { Job } from '@shared/schema';
import { Link } from 'wouter';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
}

// Use React.memo to prevent unnecessary re-renders when job data hasn't changed
const JobCard: React.FC<JobCardProps> = memo(({ job, isSelected, onSelect }) => {
  const {
    id,
    title,
    category,
    paymentType,
    paymentAmount,
    location,
    status,
    datePosted,
    dateNeeded
  } = job;
  
  // Calculate service fee and total amount based on payment amount
  const serviceFee = paymentAmount ? paymentAmount * 0.05 : 0;
  const totalAmount = paymentAmount ? paymentAmount + serviceFee : 0;
  
  // Calculate proper distance if we have coordinates, otherwise use 0
  // In a real app, this would come from the server with the job data
  const distance = (job as any).distanceMiles || 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking to select
    if (onSelect) onSelect(job);
  };
  
  const categoryColor = getCategoryColor(category);
  const categoryIcon = getCategoryIcon(category);

  return (
    <Link href={`/job/${id}`}>
      <div 
        className={`border-b border-border hover:bg-secondary/40 cursor-pointer transition-colors duration-150 ease-in-out 
          ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
        onClick={handleClick}
      >
        <div className="px-4 py-4 sm:px-6">
          {/* Top section with category, title, and payment info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center overflow-hidden">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 text-primary">
                <i className={`ri-${categoryIcon} text-xl`}></i>
              </div>
              <div className="ml-3 overflow-hidden">
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-medium text-primary px-2 py-0.5 bg-primary/5 rounded-full">
                    {category}
                  </p>
                  {status && (
                    <Badge variant={
                      status === 'open' ? 'outline' : 
                      status === 'assigned' ? 'secondary' : 
                      status === 'completed' ? 'default' : 'outline'
                    } className="capitalize text-xs">
                      {status}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-1 mt-0.5">{title}</p>
              </div>
            </div>
            <div className="ml-2 flex-shrink-0 flex flex-col items-end">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-medium">
                {paymentType === 'hourly' ? `${formatCurrency(paymentAmount)}/hr` : formatCurrency(paymentAmount)}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {paymentType === 'fixed' 
                  ? `Total: ${formatCurrency(totalAmount)}` 
                  : `Est. fee: ${formatCurrency(serviceFee)}`}
              </div>
            </div>
          </div>
          
          {/* Bottom section with location, date info */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <i className="ri-map-pin-line mr-1"></i>
              {location ? (
                <span className="truncate">{location}</span>
              ) : distance > 0 ? (
                <span>{formatDistance(distance)}</span>
              ) : (
                <span>Remote</span>
              )}
            </div>
            
            <div className="flex items-center text-xs text-muted-foreground justify-end">
              <i className="ri-time-line mr-1"></i>
              <span>
                {datePosted ? getTimeAgo(datePosted) : 'Recently posted'}
              </span>
            </div>
            
            {dateNeeded && (
              <div className="flex items-center text-xs text-muted-foreground col-span-2 mt-1">
                <i className="ri-calendar-line mr-1"></i>
                <span>Needed by {new Date(dateNeeded).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these props change
  return prevProps.job.id === nextProps.job.id && 
         prevProps.isSelected === nextProps.isSelected;
});

export default JobCard;
