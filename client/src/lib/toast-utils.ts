import { useToast } from "@/hooks/use-toast";
import { ToastProps } from "@/components/ui/toast";

// Success toast helper
export const toastSuccess = (
  toast: (props: ToastProps) => void, 
  title: string, 
  description?: string
) => {
  toast({
    title,
    description,
    variant: "default",
  });
};

// Error toast helper
export const toastError = (
  toast: (props: ToastProps) => void, 
  title: string, 
  description?: string
) => {
  toast({
    title,
    description,
    variant: "destructive",
  });
};

// Info toast helper
export const toastInfo = (
  toast: (props: ToastProps) => void, 
  title: string, 
  description?: string
) => {
  toast({
    title,
    description,
    variant: "default",
  });
};