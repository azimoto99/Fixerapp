import { useToast } from "@/hooks/use-toast";

/**
 * Show a success toast notification
 * @param message The message to show in the toast
 */
export const toastSuccess = (message: string) => {
  const { success } = useToast();
  success(message);
};

/**
 * Show an error toast notification
 * @param message The message to show in the toast
 */
export const toastError = (message: string) => {
  const { error } = useToast();
  error(message);
};

/**
 * Show an info toast notification
 * @param message The message to show in the toast
 */
export const toastInfo = (message: string) => {
  const { info } = useToast();
  info(message);
};