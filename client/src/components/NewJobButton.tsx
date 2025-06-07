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
      
      <div className={`fixed right-6 bottom-32 md:bottom-24 z-[200] ${isDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
        <Button 
          size="lg"
          onClick={handleClick}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-4 px-6 rounded-full shadow-lg transition-transform hover:scale-105 transform-gpu flex items-center gap-2"
          style={{ width: "auto", height: "auto" }}
          aria-label="Post a new job"
        >
          <Plus className="h-5 w-5" />
          <span className="text-base">Post Job</span>
        </Button>
      </div>
    </>
  );
};

export default NewJobButton;
