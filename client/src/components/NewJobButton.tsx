import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PostJobDrawer from './PostJobDrawer';

const NewJobButton: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
    } else {
      setIsDrawerOpen(true);
    }
  };
  
  return (
    <>
      <PostJobDrawer 
        isOpen={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen}
      />
      
      <div className="fixed right-6 bottom-24 md:bottom-12 z-[1000]">
        <Button 
          size="lg"
          onClick={handleClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-full shadow-lg transition-transform hover:scale-105 transform-gpu flex items-center gap-2"
          style={{ width: "auto", height: "auto" }}
          aria-label="Post a new job"
        >
          <Plus className="h-6 w-6" />
          <span className="text-base">Post Job</span>
        </Button>
      </div>
    </>
  );
};

export default NewJobButton;
