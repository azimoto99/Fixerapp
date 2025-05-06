import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import GuideCharacter from './GuideCharacter';
import { X, ArrowRight, ThumbsUp } from 'lucide-react';

interface GuidedTooltipProps {
  id: string;
  title: string;
  content: string | React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  targetSelector?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  onNext?: () => void;
  showNextButton?: boolean;
  showDismissButton?: boolean;
  characterExpression?: 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';
  persist?: boolean;
  className?: string;
  highlight?: boolean;
  highlightPulse?: boolean;
  delay?: number;
  forceShow?: boolean;
  dismissOnClickOutside?: boolean;
}

const GuidedTooltip: React.FC<GuidedTooltipProps> = ({
  id,
  title,
  content,
  position = 'bottom',
  targetSelector,
  children,
  onClose,
  onNext,
  showNextButton = false,
  showDismissButton = true,
  characterExpression = 'happy',
  persist = false,
  className,
  highlight = false,
  highlightPulse = false,
  delay = 0,
  forceShow = false,
  dismissOnClickOutside = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [characterPosition, setCharacterPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [dismissed, setDismissed] = useState(false);

  // Check if the tooltip has been dismissed before
  useEffect(() => {
    if (persist) return; // Don't check localStorage if tooltip should persist
    
    const dismissedTooltips = localStorage.getItem('dismissedTooltips');
    if (dismissedTooltips) {
      const parsedDismissed = JSON.parse(dismissedTooltips);
      if (parsedDismissed.includes(id)) {
        setDismissed(true);
      }
    }
  }, [id, persist]);

  // Find target element and set visibility after delay
  useEffect(() => {
    if (dismissed && !forceShow) return;
    
    let target: HTMLElement | null = null;
    
    if (targetSelector) {
      target = document.querySelector(targetSelector);
      setTargetElement(target);
    }
    
    // Apply delay before showing tooltip
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [targetSelector, delay, dismissed, forceShow]);

  // Position tooltip relative to target element
  useEffect(() => {
    if (!targetElement) return;
    
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const tooltipWidth = 320; // Approximate tooltip width
      const tooltipHeight = 200; // Approximate tooltip height
      
      // Calculate position based on placement preference
      let top = 0;
      let left = 0;
      
      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 10;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          setCharacterPosition('bottom-right');
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.right + 10;
          setCharacterPosition('top-left');
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          setCharacterPosition('top-right');
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          left = rect.left - tooltipWidth - 10;
          setCharacterPosition('top-right');
          break;
        default:
          top = rect.bottom + 10;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          setCharacterPosition('top-right');
      }
      
      // Adjust position to keep tooltip within viewport
      top = Math.max(10, Math.min(windowHeight - tooltipHeight - 10, top));
      left = Math.max(10, Math.min(windowWidth - tooltipWidth - 10, left));
      
      setTooltipPosition({ top, left });
    };
    
    // Calculate position initially and on resize
    updatePosition();
    window.addEventListener('resize', updatePosition);
    
    return () => window.removeEventListener('resize', updatePosition);
  }, [targetElement, position]);

  // Handle closing the tooltip
  const handleClose = () => {
    setIsVisible(false);
    
    // Save dismissed state in localStorage
    if (!persist) {
      const dismissedTooltips = localStorage.getItem('dismissedTooltips');
      let parsedDismissed = dismissedTooltips ? JSON.parse(dismissedTooltips) : [];
      
      if (!parsedDismissed.includes(id)) {
        parsedDismissed.push(id);
        localStorage.setItem('dismissedTooltips', JSON.stringify(parsedDismissed));
      }
    }
    
    if (onClose) onClose();
  };

  // Handle clicking the next button
  const handleNext = () => {
    setIsVisible(false);
    if (onNext) onNext();
  };

  // Handle outside clicks
  useEffect(() => {
    if (!isVisible || !dismissOnClickOutside) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const tooltipElement = document.getElementById(`tooltip-${id}`);
      const targetElem = targetElement;
      
      if (tooltipElement && !tooltipElement.contains(e.target as Node) && 
          !(targetElem && targetElem.contains(e.target as Node))) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, targetElement, dismissOnClickOutside, id]);

  // Apply highlight effect to target element
  useEffect(() => {
    if (!targetElement || !highlight || !isVisible) return;
    
    // Save original styles
    const originalOutline = targetElement.style.outline;
    const originalPosition = targetElement.style.position;
    const originalZIndex = targetElement.style.zIndex;
    
    // Apply highlight styles
    targetElement.style.outline = '2px solid #4f46e5';
    targetElement.style.position = 'relative';
    targetElement.style.zIndex = '50';
    
    if (highlightPulse) {
      targetElement.classList.add('pulse-highlight');
    }
    
    return () => {
      // Restore original styles
      targetElement.style.outline = originalOutline;
      targetElement.style.position = originalPosition;
      targetElement.style.zIndex = originalZIndex;
      
      if (highlightPulse) {
        targetElement.classList.remove('pulse-highlight');
      }
    };
  }, [targetElement, highlight, highlightPulse, isVisible]);

  // If dismissed and not forced to show, or explicitly set to not visible, don't render
  if ((dismissed && !forceShow) || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Add CSS for pulse animation */}
      <style>{`
        @keyframes pulse-border {
          0% { outline-color: rgba(79, 70, 229, 0.3); }
          50% { outline-color: rgba(79, 70, 229, 1); }
          100% { outline-color: rgba(79, 70, 229, 0.3); }
        }
        
        .pulse-highlight {
          animation: pulse-border 2s infinite;
        }
      `}</style>
      
      {/* Character Guide */}
      <GuideCharacter 
        expression={characterExpression}
        position={characterPosition}
        size="md"
      />
      
      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={`tooltip-${id}`}
            className={cn(
              "fixed z-[99] w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800",
              className
            )}
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-medium text-lg text-gray-900 dark:text-white">{title}</h3>
              {showDismissButton && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              )}
            </div>
            
            {/* Tooltip Content */}
            <div className="p-4 text-gray-700 dark:text-gray-300">
              {typeof content === 'string' ? <p>{content}</p> : content}
              {children}
            </div>
            
            {/* Tooltip Footer */}
            <div className="flex justify-end px-4 py-3 border-t border-gray-200 dark:border-gray-800">
              {showNextButton ? (
                <Button 
                  variant="outline" 
                  className="mr-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={handleClose}
                >
                  <span>Skip</span>
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="mr-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={handleClose}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  <span>Got it</span>
                </Button>
              )}
              
              {showNextButton && (
                <Button onClick={handleNext}>
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GuidedTooltip;