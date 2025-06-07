import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface SimpleToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  position?: 'top' | 'bottom';
}

// Style variants for different toast types
const toastVariants = cva(
  "fixed flex items-center p-4 rounded-lg shadow-lg max-w-md w-full transition-all",
  {
    variants: {
      type: {
        success: "bg-green-50 text-green-800 dark:bg-green-900/90 dark:text-green-100 border-l-4 border-green-500",
        error: "bg-red-50 text-red-800 dark:bg-red-900/90 dark:text-red-100 border-l-4 border-red-500",
        info: "bg-blue-50 text-blue-800 dark:bg-blue-900/90 dark:text-blue-100 border-l-4 border-blue-500",
      },
      position: {
        top: "top-4 left-1/2 -translate-x-1/2",
        bottom: "bottom-4 left-1/2 -translate-x-1/2",
      },
    },
    defaultVariants: {
      type: "info",
      position: "top",
    },
  }
);

const SimpleToast: React.FC<SimpleToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) setTimeout(onClose, 300); // Give time for animation before calling onClose
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) setTimeout(onClose, 300);
  };

  const icon = {
    success: <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />,
    info: <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />,
  }[type];

  return (
    <div 
      className={cn(
        toastVariants({ type, position }),
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        "z-[900]" // Using --z-emergency level instead of ultra-high value
      )}
      style={{ transition: "opacity 0.3s ease, transform 0.3s ease" }}
      role="alert"
    >
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button 
        onClick={handleClose}
        className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SimpleToast;