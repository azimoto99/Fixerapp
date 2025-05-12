import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useEffect, useState } from "react"

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  
  useEffect(() => {
    setMounted(true);
    
    // Subscribe to toast events
    if (typeof window !== 'undefined') {
      const handleToast = (event: CustomEvent) => {
        const { toast } = event.detail;
        setToasts((prev) => [...prev, toast]);
      };
      
      const handleDismiss = (event: CustomEvent) => {
        const { id } = event.detail;
        setToasts((prev) => 
          prev.map((toast) => 
            toast.id === id ? { ...toast, open: false } : toast
          )
        );
        
        // Remove toast after animation
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 300);
      };
      
      window.addEventListener('toast', handleToast as any);
      window.addEventListener('toast-dismiss', handleDismiss as any);
      
      return () => {
        window.removeEventListener('toast', handleToast as any);
        window.removeEventListener('toast-dismiss', handleDismiss as any);
      };
    }
  }, []);

  if (!mounted) return null;
  
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, open, ...props }) => (
        <Toast key={id} {...props} open={open}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}