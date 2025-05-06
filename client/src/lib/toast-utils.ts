import { toast as uiToast } from "@/components/ui/use-toast";

/**
 * Show a success toast notification
 * @param message The message to show in the toast
 */
export const toastSuccess = (message: string) => {
  uiToast({
    title: "Success",
    description: message,
    variant: "default",
  });
};

/**
 * Show an error toast notification
 * @param message The message to show in the toast
 */
export const toastError = (message: string) => {
  uiToast({
    title: "Error",
    description: message,
    variant: "destructive",
  });
};

/**
 * Show an info toast notification
 * @param message The message to show in the toast
 */
export const toastInfo = (message: string) => {
  uiToast({
    description: message,
  });
};