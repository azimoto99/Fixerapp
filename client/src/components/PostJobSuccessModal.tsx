import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from 'wouter';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface PostJobSuccessModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
}

const PostJobSuccessModal: React.FC<PostJobSuccessModalProps> = ({
  open,
  onClose,
  jobId,
  jobTitle,
}) => {
  const [, navigate] = useLocation();

  const handleViewJob = () => {
    navigate(`/job/${jobId}`);
    onClose();
  };

  const handleFindMore = () => {
    navigate('/');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold text-green-700">Job Posted Successfully!</h3>
            <p className="mt-2 text-gray-600">
              "{jobTitle}" has been posted and is now available for workers to view and apply
            </p>
          </div>
          
          <Card className="p-4 bg-gray-50 border border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-1.5 mr-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Payment Processed</p>
                  <p className="text-sm text-gray-500">Your payment has been securely processed</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-1.5 mr-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Job Listed</p>
                  <p className="text-sm text-gray-500">Your job is now visible to potential workers</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-1.5 mr-3">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Next: Review Applications</p>
                  <p className="text-sm text-gray-500">You'll be notified when workers apply</p>
                </div>
              </div>
            </div>
          </Card>
          
          <div className="flex space-x-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleFindMore}
            >
              Go to Home
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700" 
              onClick={handleViewJob}
            >
              View Job Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostJobSuccessModal;