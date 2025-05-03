import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDistance, formatDateTime, getCategoryIcon, getCategoryColor } from '@/lib/utils';
import { Job } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className={`flex-shrink-0 bg-${categoryColor}-100 rounded-md p-2 mt-1`}>
            <i className={`ri-${categoryIcon} text-${categoryColor}-600 text-xl`}></i>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="mt-1 flex items-center">
              <p className="text-sm text-gray-500">Posted by</p>
              <div className="ml-2 flex items-center">
                <span className="text-sm font-medium text-gray-700">User {posterId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div>
            <span className="text-xl font-bold text-green-600">{formatCurrency(paymentAmount)}</span>
            <span className="text-sm text-gray-500">{paymentType === 'hourly' ? '/hr' : ' flat'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {paymentType === 'hourly' 
              ? `+ ${formatCurrency(serviceFee)} service fee (added upon completion)` 
              : `+ ${formatCurrency(serviceFee)} service fee`}
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-1">
            {paymentType === 'hourly'
              ? `Worker receives: ${formatCurrency(paymentAmount)}/hr`
              : `Total: ${formatCurrency(totalAmount)} (Worker receives: ${formatCurrency(paymentAmount)})`}
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>{description}</p>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase">Date & Time</h4>
          <p className="mt-1 text-sm font-medium text-gray-800">
            <i className="ri-calendar-line text-gray-400 mr-1"></i>
            {formatDateTime(dateNeeded)}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase">Location</h4>
          <p className="mt-1 text-sm font-medium text-gray-800">
            <i className="ri-map-pin-line text-gray-400 mr-1"></i>
            {formatDistance(distance)} • {location}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase">Skills Required</h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {requiredSkills?.map((skill, index) => (
              <Badge key={index} variant="gray">
                {skill}
              </Badge>
            )) || <span className="text-sm text-gray-500">No specific skills required</span>}
          </div>
        </div>
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase">Required Equipment</h4>
          <p className="mt-1 text-sm text-gray-700">
            {equipmentProvided ? 'None (provided by poster)' : 'Worker must provide equipment'}
          </p>
        </div>
      </div>
      
      <div className="mt-5 flex justify-end space-x-3">
        <Button variant="outline" className="text-gray-700">
          <i className="ri-heart-line mr-2"></i>
          Save
        </Button>
        <Button variant="outline" className="text-gray-700">
          <i className="ri-message-3-line mr-2"></i>
          Message
        </Button>
        <Button onClick={handleApply} disabled={isApplying || !user || user.accountType !== 'worker'}>
          {isApplying ? 'Applying...' : 'Apply Now'}
        </Button>
      </div>
    </div>
  );
};

export default JobDetail;
