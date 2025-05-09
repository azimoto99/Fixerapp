import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NewJobButton: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  if (!user) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="fixed right-6 bottom-20 md:bottom-6 z-40">
      <Link href="/post-job">
        <Button 
          variant="circle" 
          size="circle"
          onClick={handleClick}
          className="bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          aria-label="Post a new job"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
};

export default NewJobButton;
