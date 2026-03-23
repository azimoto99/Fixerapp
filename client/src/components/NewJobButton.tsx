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
      
      <div className={`fixed right-6 bottom-32 md:bottom-24 z-40 ${isDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
        <Button 
          size="lg"
          onClick={handleClick}
          className="rounded-full px-6 py-4 text-base font-semibold shadow-[0_22px_55px_rgba(3,105,161,0.30)] transition-transform hover:scale-[1.02] flex items-center gap-2"
          style={{ width: "auto", height: "auto" }}
          aria-label="Post a new job"
        >
          <Plus className="h-5 w-5" />
          <span className="text-base">Create Job</span>
        </Button>
      </div>
    </>
  );
};

export default NewJobButton;
