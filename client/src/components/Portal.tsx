import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
  zIndex?: number;
}

// Component that creates a portal to a div outside of the main DOM hierarchy
export const Portal = ({ children, zIndex = 9999 }: PortalProps) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create a unique portal element for this instance
    const portalId = `portal-root-${Math.random().toString(36).substr(2, 9)}`;
    let element = document.getElementById(portalId);
    
    // If not, create it
    if (!element) {
      element = document.createElement('div');
      element.id = portalId;
      element.style.position = 'fixed';
      element.style.zIndex = zIndex.toString();
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
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, [zIndex]);

  // Wait until the portal root is available
  if (!portalRoot) return null;
  
  return createPortal(children, portalRoot);
};

export default Portal;