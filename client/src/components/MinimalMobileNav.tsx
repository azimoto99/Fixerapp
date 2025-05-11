import { useState } from 'react';
import { useLocation } from 'wouter';
import PostJobDrawer from './PostJobDrawer';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const MinimalMobileNav: React.FC = () => {
  const [location] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleClick = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to post a job",
        variant: "destructive"
      });
      return;
    }
    setIsDrawerOpen(true);
  };

  return (
    <>
      <PostJobDrawer 
        isOpen={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen}
      />
      
      <nav className="md:hidden bg-background border-t border-border fixed bottom-0 left-0 right-0 z-30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-center">
            <div
              onClick={handleClick}
              className={`group flex flex-col items-center py-3 px-2 cursor-pointer text-primary hover:text-primary/90`}
            >
              <i className="ri-add-circle-line text-xl"></i>
              <span className="text-xs mt-1">Post Job</span>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MinimalMobileNav;