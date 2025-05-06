import { ToastActionElement } from "@/components/ui/toast";

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
};

declare module "@/hooks/use-toast" {
  export interface ToastOptions extends ToastProps {}
  
  export interface UseToastReturn {
    toast: (props: ToastProps) => void;
    dismiss: (toastId?: string) => void;
  }
  
  export function useToast(): UseToastReturn;
}