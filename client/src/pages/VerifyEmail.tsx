import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function VerifyEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  if (!user) return null; // should not happen due to ProtectedRoute

  const resend = async () => {
    setSending(true);
    try {
      const res = await apiRequest('POST', `/api/users/${user.id}/send-email-verification`);
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Verification email sent', description: 'Please check your inbox.' });
        // For development, set the verification URL if available
        if (data.verificationUrl) {
          setVerificationUrl(data.verificationUrl);
        }
      } else {
        const data = await res.json();
        toast({ title: 'Failed to send e-mail', description: data.message || 'Unknown error', variant: 'destructive' });
      }
    } catch (err:any) {
      toast({ title: 'Failed to send e-mail', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-semibold mb-4">Verify your e-mail</h1>
      <p className="text-muted-foreground max-w-md">
        We've sent a verification link to <strong>{user.email}</strong>. Please click it to activate your account.
      </p>
      <Button className="mt-6" onClick={resend} disabled={sending}>
        {sending ? 'Sending…' : 'Resend e-mail'}
      </Button>
      {verificationUrl && (
        <div className="mt-4 text-sm text-blue-500">
          <p>Development mode: You can use this link to verify your email:</p>
          <a href={verificationUrl} className="underline">{verificationUrl}</a>
        </div>
      )}
    </div>
  );
} 