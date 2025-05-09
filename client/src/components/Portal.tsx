import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

// Component that creates a portal to a div outside of the main DOM hierarchy
export const Portal = ({ children }: PortalProps) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Check if the portal root already exists
    let element = document.getElementById('portal-root');
    
    // If not, create it
    if (!element) {
      element = document.createElement('div');
      element.id = 'portal-root';
      element.style.position = 'fixed';
      element.style.zIndex = '2147483647'; // Maximum possible z-index value
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.pointerEvents = 'none'; // Don't block clicks by default
      document.body.appendChild(element);
    }
    
    setPortalRoot(element);
    
    // Cleanup function
    return () => {
      // Don't remove the portal root as it might be used by other components
    };
  }, []);

  // Wait until the portal root is available
  if (!portalRoot) return null;
  
  return createPortal(children, portalRoot);
};

export default Portal;