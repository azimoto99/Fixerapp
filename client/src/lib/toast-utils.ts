import { toast } from "@/hooks/use-toast";

type ToastMessage = {
  title?: string;
  description: string;
};

// Create toast utilities as an object instead of a hook
const toastHandlers = {
  success: (message: string) => {
    toast({
      title: "Success",
      description: message,
      variant: "default",
    });
  },
  
  error: (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  },
  
  info: (message: string) => {
    toast({
      description: message,
      variant: "default",
    });
  }
};

export default toastHandlers;