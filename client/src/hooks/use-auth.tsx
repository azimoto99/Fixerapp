import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Extended user type to include potential account type selection flag
interface UserWithFlags extends SelectUser {
  needsAccountType?: boolean;
  requiresProfileCompletion?: boolean;
  stripeConnectSetupComplete?: boolean;
}

type AuthContextType = {
  user: UserWithFlags | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserWithFlags, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserWithFlags, Error, InsertUser>;
  setAccountTypeMutation: UseMutationResult<UserWithFlags, Error, SetAccountTypeData>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

type SetAccountTypeData = {
  userId: number;
  accountType: 'worker' | 'poster';
  provider: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithFlags | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (userData: UserWithFlags) => {
      // Check if user needs to complete their profile first (for social logins)
      if (userData.requiresProfileCompletion) {
        // Redirect to profile completion page
        setLocation(`/complete-profile?id=${userData.id}&provider=google`);
        toast({
          title: "Profile completion required",
          description: "Please complete your profile to continue",
        });
      } 
      // Then check if user needs to select an account type
      else if (userData.needsAccountType) {
        // Redirect to account type selection page
        setLocation(`/account-type-selection?id=${userData.id}&provider=local`);
        toast({
          title: "Account type required",
          description: "Please select your account type to continue",
        });
      } else {
        // Normal login flow
        queryClient.setQueryData(["/api/user"], userData);
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (userData: UserWithFlags) => {
      // Check if user needs to complete their profile first (for social logins)
      if (userData.requiresProfileCompletion) {
        // Redirect to profile completion page
        setLocation(`/complete-profile?id=${userData.id}&provider=google`);
        toast({
          title: "Profile completion required",
          description: "Please complete your profile to continue",
        });
      } 
      // Then check if user needs to select an account type
      else if (userData.needsAccountType) {
        // Redirect to account type selection page
        setLocation(`/account-type-selection?id=${userData.id}&provider=local`);
        toast({
          title: "Registration successful",
          description: "Please select your account type to continue",
        });
      } else {
        // Normal registration flow
        queryClient.setQueryData(["/api/user"], userData);
        toast({
          title: "Registration successful", 
          description: "Your account has been created!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const setAccountTypeMutation = useMutation({
    mutationFn: async (data: SetAccountTypeData) => {
      const res = await apiRequest("POST", "/api/set-account-type", data);
      return await res.json();
    },
    onSuccess: (userData: UserWithFlags) => {
      queryClient.setQueryData(["/api/user"], userData);
      
      // Check if user needs to setup Stripe Connect
      if (!userData.stripeConnectSetupComplete) {
        setLocation('/connect-setup');
        toast({
          title: "Account type set",
          description: "Please set up your payment account to continue",
        });
      } else {
        setLocation('/');
        toast({
          title: "Account type set",
          description: `You are now signed in as a ${userData.accountType}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error setting account type",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        setAccountTypeMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}