import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const NewJobButton: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <div className="fixed right-6 bottom-20 md:bottom-6 z-40">
      <Link href="/post-job">
        <Button 
          variant="circle" 
          size="circle"
          className="bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500"
        >
          <i className="ri-add-line text-xl"></i>
        </Button>
      </Link>
    </div>
  );
};

export default NewJobButton;
