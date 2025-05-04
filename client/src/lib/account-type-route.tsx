import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";
import { useToast } from "@/hooks/use-toast";

export function AccountTypeRoute({
  path,
  component: Component,
  allowedType,
}: {
  path: string;
  component: React.ComponentType<any>;
  allowedType: 'worker' | 'poster';
}) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        // If the user needs to complete their profile (for social logins)
        if (user.requiresProfileCompletion) {
          return <Redirect to={`/complete-profile?id=${user.id}`} />;
        }
        
        // If user has pending account type, redirect to account type selection
        if (user.accountType === "pending") {
          return <Redirect to={`/account-type-selection?id=${user.id}&provider=local`} />;
        }

        if (user.accountType !== allowedType) {
          // Show error message
          toast({
            title: "Access Denied",
            description: `This page is only available to ${allowedType === 'worker' ? 'workers' : 'job posters'}`,
            variant: "destructive",
          });
          
          // Redirect to home page
          return <Redirect to="/" />;
        }

        return <Component {...params} />;
      }}
    </Route>
  );
}