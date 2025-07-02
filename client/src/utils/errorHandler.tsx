import { useToast } from "@/hooks/use-toast";

// Create a hook that returns the error handler function
export function useErrorHandler() {
  const { toast } = useToast();
  
  return (error: any, message: string) => {
    console.error(message, error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : message,
      variant: "destructive"
    });
  };
}

// For non-hook contexts, provide a simpler function that just logs
export function logError(error: any, message: string) {
  console.error(message, error);
  // Cannot show toast outside of React components
}