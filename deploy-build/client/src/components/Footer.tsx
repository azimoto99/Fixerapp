import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import TermsOfService from './TermsOfService';

const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);
  
  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t border-border z-[9000] py-2 px-4 text-xs text-muted-foreground">
        <div className="flex justify-center items-center">
          <span>© {new Date().getFullYear()} Fixer</span>
          <span className="mx-2">•</span>
          <Button 
            variant="link" 
            onClick={() => setShowTerms(true)} 
            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
          >
            Terms of Service
          </Button>
        </div>
      </footer>
      
      <TermsOfService
        open={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </>
  );
};

export default Footer;