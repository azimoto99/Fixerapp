import React from "@/lib/ensure-react";
import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, InsertUser } from "@shared/schema";
import type { DbUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Extended user type to include potential account type selection flag
interface UserWithFlags extends DbUser {
  needsAccountType?: boolean;
  requiresProfileCompletion?: boolean;
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
  const [location, navigate] = useLocation();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserWithFlags | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Redirect unverified users
  useEffect(() => {
    if (user && !user.emailVerified && location !== '/verify-email') {
      navigate('/verify-email');
    }
    if (user && user.emailVerified && location === '/verify-email') {
      navigate('/');
    }
  }, [user, location]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log('Attempting login with username:', credentials.username);
        
        // Enhanced login flow with apiRequest for consistent error handling
        const res = await apiRequest("POST", "/api/login", credentials);
        
        console.log('Login response status:', res.status);
        
        const userData = await res.json();
        console.log('Login successful, user data retrieved:', userData.id);
        return userData;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    onSuccess: async (userData: UserWithFlags) => {
      // Check if user needs to complete their profile first (for social logins)
      if (userData.requiresProfileCompletion) {
        // Redirect to profile completion page
        navigate(`/complete-profile?id=${userData.id}&provider=google`);
        toast({
          title: "Profile completion required",
          description: "Please complete your profile to continue",
        });
      } else {
        // Normal login flow - no need to check account type as all users are workers
        queryClient.setQueryData(["/api/user"], userData);
        
        // Verify the session is established by making a call to /api/user
        try {
          const res = await apiRequest('GET', '/api/user');
          const verifiedUser = await res.json();
          console.log('Session verified after login:', verifiedUser.id);
          
          // Update the query cache with the verified user data
          queryClient.setQueryData(["/api/user"], verifiedUser);
          
          // Invalidate and refetch to ensure fresh data
          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          
          toast({
            title: "Login successful",
            description: "Welcome back!",
          });
          
          // Small delay to ensure state is updated before navigation
          setTimeout(() => {
            navigate('/');
          }, 100);
        } catch (err) {
          console.error('Error verifying session after login:', err);
          toast({
            title: "Login successful",
            description: "Welcome back! Please refresh if needed.",
          });
        }
      }
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        console.log('Attempting registration with username:', credentials.username);
        
        // Enhanced registration flow with apiRequest for consistent error handling
        const res = await apiRequest("POST", "/api/register", credentials);
        
        console.log('Registration response status:', res.status);
        
        // Check if response is ok before parsing
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Registration failed' }));
          const error = new Error(errorData.message || 'Registration failed') as any;
          // Attach suggestions if available for username issues
          if (errorData.suggestions) {
            error.suggestions = errorData.suggestions;
          }
          if (errorData.severity) {
            error.severity = errorData.severity;
          }
          throw error;
        }
        
        const userData = await res.json();
        console.log('Registration successful, user data retrieved:', userData.id);
        
        // Validate the user data
        if (!userData || !userData.id) {
          throw new Error('Invalid user data received from server');
        }
        
        return userData;
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    onSuccess: async (userData: UserWithFlags) => {
      try {
        // Check if user needs to complete their profile first (for social logins)
        if (userData.requiresProfileCompletion) {
          // Redirect to profile completion page
          navigate(`/complete-profile?id=${userData.id}&provider=google`);
          toast({
            title: "Profile completion required",
            description: "Please complete your profile to continue",
          });
          return;
        }
        
        // Normal registration flow - no need to check account type as all users are workers
        queryClient.setQueryData(["/api/user"], userData);
        
        // Show success message immediately
        toast({
          title: "Registration successful", 
          description: "Setting up your account...",
        });
        
        // Wait a bit for the session to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify the session is established by making a call to /api/user
        try {
          const res = await apiRequest('GET', '/api/user');
          if (!res.ok) {
            throw new Error('Session verification failed');
          }
          
          const verifiedUser = await res.json();
          console.log('Session verified after registration:', verifiedUser.id);
          
          // Update the query cache with the verified user data
          queryClient.setQueryData(["/api/user"], verifiedUser);
          
          // Invalidate and refetch to ensure fresh data
          await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          
          // Navigate to home
          navigate('/');
        } catch (err) {
          console.error('Error verifying session after registration:', err);
          
          // Still try to navigate even if verification fails
          toast({
            title: "Welcome!", 
            description: "Your account is ready. Redirecting...",
          });
          
          // Give it another moment then navigate
          setTimeout(() => {
            navigate('/');
          }, 1000);
        }
      } catch (error) {
        console.error('Error in registration success handler:', error);
        toast({
          title: "Registration completed", 
          description: "Please refresh the page if you're not redirected.",
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Registration mutation error:', error);
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
      navigate('/');
      toast({
        title: "Account type set",
        description: `You are now signed in as a ${userData.accountType}`,
      });
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
      // Use apiRequest for consistent error handling
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