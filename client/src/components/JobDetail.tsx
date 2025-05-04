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
    <div className="bg-white">
      {/* Job details */}
      <div className="px-5 py-3">
        {/* Title and location */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <div className="flex items-center mb-3">
          <span 
            className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-1 animate-bounce-in"
            style={{ backgroundColor: categoryColor || '#3b82f6' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              {categoryIcon}
            </svg>
          </span>
          <span className="text-sm text-gray-600">{category}</span>
          <span className="mx-2 text-gray-300">•</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500 mr-1">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-sm text-gray-600">{formatDistance(distance)} away</span>
        </div>
        
        {/* Payment info in a card - DoorDash-style */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100 animate-bounce-in">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Payment</div>
              <div className="font-bold text-lg text-gray-900">
                {formatCurrency(paymentAmount)}{paymentType === 'hourly' ? '/hr' : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Service Fee</div>
              <div className="font-medium text-gray-700">
                {formatCurrency(serviceFee)}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-600">
              Total
            </div>
            <div className="font-bold text-green-600">
              {formatCurrency(totalAmount)}{paymentType === 'hourly' ? '/hr' : ''}
            </div>
          </div>
        </div>
        
        {/* Date and time */}
        <div className="flex items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500 mr-2">
            <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
            <path d="M18 14v4h-4" />
            <path d="M15 14h3v3" />
          </svg>
          <div className="text-sm text-gray-700">{formatDateTime(dateNeeded)}</div>
        </div>
        
        {/* Job description */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Description</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
        
        {/* Location */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Location</h4>
          <div className="bg-gray-50 rounded-lg overflow-hidden h-24 flex items-center justify-center mb-1">
            <div className="text-sm text-gray-500">Map location preview</div>
          </div>
          <p className="text-sm text-gray-700">{location}</p>
        </div>
        
        {/* Skills tags */}
        {requiredSkills && requiredSkills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Skills Required</h4>
            <div className="flex flex-wrap gap-1.5">
              {requiredSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Equipment */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Equipment</h4>
          <div className="flex items-center text-sm text-gray-700">
            {equipmentProvided ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500 mr-2">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                All equipment provided by job poster
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-500 mr-2">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                  <path d="M12 8v4"/>
                  <path d="M12 16h.01"/>
                </svg>
                Worker must provide equipment
              </>
            )}
          </div>
        </div>
        
        {/* Task checklist */}
        <div className="mb-12"> {/* Extra margin at bottom for the fixed Apply button */}
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Job Tasks</h4>
          <TaskList 
            jobId={job.id} 
            isJobPoster={user?.id === job.posterId}
            isWorker={user?.id === job.workerId}
          />
        </div>
      </div>
      
      {/* Quick action footer buttons - hidden since we now have a fixed apply button in MapSection */}
      <div className="hidden sticky bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex space-x-3">
        <Button 
          variant="outline" 
          className="flex-1"
          size="sm"
          onClick={handleApply}
          disabled={isApplying || !user || user.accountType !== 'worker'}
        >
          {isApplying ? 'Applying...' : 'Apply for Job'}
        </Button>
      </div>
    </div>
  );
};

export default JobDetail;
