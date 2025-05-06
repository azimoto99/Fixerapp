import { type ToastActionElement } from "@/components/ui/toast";

export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
  open?: boolean;
};

interface ToastFunction {
  (props: ToastProps): { id: string; dismiss: () => void };
  dismiss: (id?: string) => void;
  success: (message: string) => { id: string; dismiss: () => void };
  error: (message: string) => { id: string; dismiss: () => void };
  info: (message: string) => { id: string; dismiss: () => void };
}

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

// Helper for creating toast
function createToastEvent(props: ToastProps) {
  const id = props.id || genId();
  
  if (typeof window !== 'undefined') {
    // Create and dispatch a custom event with the toast data
    const event = new CustomEvent('toast', {
      detail: {
        toast: {
          ...props,
          id,
          open: true,
        },
      },
    });
    
    window.dispatchEvent(event);
  }
  
  return {
    id,
    dismiss: () => dismissToast(id),
  };
}

// Helper for dismissing toast
function dismissToast(id?: string) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('toast-dismiss', {
      detail: { id },
    });
    window.dispatchEvent(event);
  }
}

// Main toast function with helper methods
export const toast = (props: ToastProps) => createToastEvent(props);

// Add helper methods to the toast function
toast.dismiss = dismissToast;

// Success toast
toast.success = (message: string) => createToastEvent({
  title: "Success",
  description: message,
  variant: "default",
});

// Error toast
toast.error = (message: string) => createToastEvent({
  title: "Error",
  description: message,
  variant: "destructive",
});

// Info toast
toast.info = (message: string) => createToastEvent({
  description: message,
  variant: "default",
});

// Hook version for component use
export function useToast() {
  return { toast };
}