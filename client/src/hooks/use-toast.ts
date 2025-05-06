import { toast } from '@/components/ui/use-toast';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

export function useToast() {
  const showToast = ({
    title,
    description,
    variant = 'default',
    duration = 3000
  }: ToastOptions) => {
    toast({
      title,
      description,
      variant,
      duration,
    });
  };

  return {
    toast: showToast,
    success: (title: string, description?: string) =>
      showToast({ title, description, variant: 'default' }),
    error: (title: string, description?: string) =>
      showToast({ title, description, variant: 'destructive' }),
  };
}