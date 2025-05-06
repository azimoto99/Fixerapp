import { type ToastActionElement } from "@/components/ui/toast";

export type ToastProps = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
  open?: boolean;
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

export function useToast() {
  const toast = (props: ToastProps) => {
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
      dismiss: () => {
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('toast-dismiss', {
            detail: { id },
          });
          window.dispatchEvent(event);
        }
      },
    };
  };
  
  toast.dismiss = (id?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast-dismiss', {
        detail: { id },
      });
      window.dispatchEvent(event);
    }
  };
  
  return { toast };
}