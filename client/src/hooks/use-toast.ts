
import { toast as uiToast } from "@/components/ui/use-toast";

export interface ToastHelpers {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  toast: typeof uiToast;
}

export function useToast(): ToastHelpers {
  return {
    toast: uiToast,
    success: (message: string) => {
      uiToast({
        title: "Success",
        description: message,
        variant: "default",
      });
    },
    error: (message: string) => {
      uiToast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
    info: (message: string) => {
      uiToast({
        description: message,
      });
    },
  };
}
