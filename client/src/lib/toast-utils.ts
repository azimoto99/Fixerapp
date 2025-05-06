import { toast } from "@/hooks/use-toast";

type ToastMessage = {
  title?: string;
  description: string;
};

// Export the createToastHandlers function for components that need
// consistent toast styling across the application
export function createToastHandlers() {
  return { toast };
}

// Export the default toast object for direct imports
export default toast;