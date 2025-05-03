import React from 'react';
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon, getCategoryColor, formatCurrency, formatDistance, getTimeAgo } from "@/lib/utils";
import { Job } from '@shared/schema';
import { Link } from 'wouter';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isSelected, onSelect }) => {
  const {
    id,
    title,
    category,
    paymentType,
    paymentAmount,
    serviceFee = 2.50, // Default service fee if not provided
    totalAmount = paymentAmount + serviceFee,
    latitude,
    longitude,
    datePosted
  } = job;

  // Calculate distance to job (mock for now)
  const distance = Math.random() * 2; // Random distance between 0-2 miles for demo

  const handleClick = () => {
    if (onSelect) onSelect(job);
  };
  
  const categoryColor = getCategoryColor(category);
  const categoryIcon = getCategoryIcon(category);

  return (
    <Link href={`/job/${id}`}>
      <div 
        className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
        onClick={handleClick}
      >
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`flex-shrink-0 bg-${categoryColor}-100 rounded-md p-2`}>
                <i className={`ri-${categoryIcon} text-${categoryColor}-600 text-xl`}></i>
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium text-${categoryColor}-600`}>{category}</p>
                <p className="text-sm font-medium text-gray-900">{title}</p>
              </div>
            </div>
            <div className="ml-2 flex-shrink-0 flex flex-col items-end">
              <Badge variant="price">
                {paymentType === 'hourly' ? `${formatCurrency(paymentAmount)}/hr` : formatCurrency(paymentAmount)}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">
                +{formatCurrency(serviceFee)} fee
              </div>
            </div>
          </div>
          <div className="mt-2 sm:flex sm:justify-between">
            <div className="sm:flex">
              <p className="flex items-center text-sm text-gray-500">
                <i className="ri-map-pin-line text-gray-400 mr-1"></i>
                {formatDistance(distance)}
              </p>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
              <i className="ri-time-line text-gray-400 mr-1"></i>
              <p>
                Posted {getTimeAgo(datePosted || new Date())}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default JobCard;
