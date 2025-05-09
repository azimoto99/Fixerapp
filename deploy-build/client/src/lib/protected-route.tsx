import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();

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

        // Always set account type to worker, so no need to check for pending status

        return <Component {...params} />;
      }}
    </Route>
  );
}