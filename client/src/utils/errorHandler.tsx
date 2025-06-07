import { toast } from "@/lib/toast-utils";

export function handleError(error: any, message: string) {
  console.error(message, error);
  toast({
    title: "Error",
    description: error instanceof Error ? error.message : message,
    variant: "destructive"
  });
}