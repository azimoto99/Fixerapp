import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDistance, formatDateTime, getCategoryIcon, getCategoryColor } from '@/lib/utils';
import { Job } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import TaskList from './TaskList';

interface JobDetailProps {
  job: Job;
  distance?: number;
  onClose?: () => void;
}

const JobDetail: React.FC<JobDetailProps> = ({ job, distance = 0.5, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);
  
  const {
    title,
    description,
    category,
    paymentType,
    paymentAmount,
    serviceFee = 2.50, // Default service fee if not provided
    totalAmount = paymentAmount + serviceFee, // Calculate total if not provided
    location,
    dateNeeded,
    requiredSkills,
    equipmentProvided,
    posterId
  } = job;

  const categoryColor = getCategoryColor(category);
  const categoryIcon = getCategoryIcon(category);
  
  const handleApply = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to apply for this job",
        variant: "destructive"
      });
      return;
    }
    
    if (user.accountType !== 'worker') {
      toast({
        title: "Worker Account Required",
        description: "You need a worker account to apply for jobs",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsApplying(true);
      await apiRequest('POST', '/api/applications', {
        jobId: job.id,
        workerId: user.id,
        message: "I'm interested in this job!"
      });
      
      toast({
        title: "Application Submitted",
        description: "Your application has been submitted successfully"
      });
    } catch (error) {
      toast({
        title: "Application Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white rounded-t-xl">
      {/* Close button */}
      {onClose && (
        <div className="absolute top-4 right-4 z-[1001]">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={onClose} 
            className="h-8 w-8 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
      )}
      
      {/* Header with pay amount */}
      <div className="px-4 pt-4 pb-2 border-b">
        <div className="flex items-center mb-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3`} 
               style={{ backgroundColor: categoryColor || '#3b82f6' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M20 7h-9m0 0-4 4m4-4-4-4M4 17h9m0 0 4 4m-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              <span className="font-medium">{formatDistance(distance)}</span> • {category}
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3 mb-2">
          <div className="text-sm font-medium text-gray-600">
            {location} • {formatDateTime(dateNeeded)}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(paymentAmount)}<span className="text-sm font-normal text-gray-600">{paymentType === 'hourly' ? '/hr' : ''}</span>
            </div>
            <div className="text-xs text-gray-500">
              + {formatCurrency(serviceFee)} service fee
            </div>
          </div>
        </div>
      </div>
      
      {/* Job details */}
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Job Details</h4>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        
        {/* Skills tags */}
        {requiredSkills && requiredSkills.length > 0 && (
          <div className="mb-3">
            <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Skills Required</h5>
            <div className="flex flex-wrap gap-1">
              {requiredSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Equipment */}
        <div className="text-sm mb-4">
          <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Equipment</span>
          <span className="text-gray-700">
            {equipmentProvided ? 'All equipment provided by job poster' : 'Worker must provide equipment'}
          </span>
        </div>
        
        {/* Task checklist */}
        <div className="mt-2 mb-3">
          <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Job Tasks</h5>
          <TaskList 
            jobId={job.id} 
            isJobPoster={user?.id === job.posterId}
            isWorker={user?.id === job.workerId}
          />
        </div>
      </div>
      
      {/* Quick action buttons */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex space-x-3">
        <Button 
          variant="outline" 
          className="flex-1 flex items-center justify-center text-gray-700"
          size="sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
            <circle cx="12" cy="12" r="10" />
            <path d="m12 8 4 4-4 4M8 12h8" />
          </svg>
          Directions
        </Button>
        
        <Button 
          variant="outline"  
          className="flex-1 flex items-center justify-center text-gray-700"
          size="sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Message
        </Button>
        
        <Button 
          onClick={handleApply} 
          disabled={isApplying || !user || user.accountType !== 'worker'}
          className="flex-[2]"
          size="sm"
        >
          {isApplying ? 'Applying...' : 'Apply for Job'}
        </Button>
      </div>
    </div>
  );
};

export default JobDetail;
