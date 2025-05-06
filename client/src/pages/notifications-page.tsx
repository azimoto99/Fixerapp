import { useNavigate } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { NotificationList } from "@/components/notifications/NotificationList";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>
      
      <div className="bg-card rounded-lg border shadow-sm">
        <NotificationList maxHeight="calc(100vh - 200px)" />
      </div>
    </div>
  );
}