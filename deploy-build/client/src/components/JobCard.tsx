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
    serviceFee = 2.50,
    totalAmount = paymentAmount + serviceFee,
    latitude,
    longitude,
    datePosted
  } = job;
  
  // Calculate distance (would be provided by the server in a real app)
  const distance = Math.random() * 2; // Temporary random distance until we calculate it properly

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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 text-primary">
                <i className={`ri-${categoryIcon} text-xl`}></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-primary">{category}</p>
                <p className="text-sm font-medium text-foreground line-clamp-1">{title}</p>
              </div>
            </div>
            <div className="ml-2 flex-shrink-0 flex flex-col items-end">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-medium">
                {paymentType === 'hourly' ? `${formatCurrency(paymentAmount)}/hr` : formatCurrency(paymentAmount)}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {paymentType === 'fixed' 
                  ? `Total: ${formatCurrency(totalAmount)}` 
                  : `+${formatCurrency(serviceFee)} fee`}
              </div>
            </div>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex">
              <p className="flex items-center text-sm text-muted-foreground">
                <i className="ri-map-pin-line mr-1"></i>
                {formatDistance(distance)}
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-muted-foreground sm:mt-0">
              <i className="ri-time-line mr-1"></i>
              <p>
                Posted {getTimeAgo(datePosted || new Date())}
              </p>
            </div>
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
