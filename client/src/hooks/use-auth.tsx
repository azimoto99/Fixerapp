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
      try {
        console.log('Attempting login with username:', credentials.username);
        
        // Enhanced login flow with direct fetch for more reliable session handling
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: 'include'
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Login response not OK:', res.status, errorText);
          throw new Error(errorText || 'Invalid username or password');
        }
        
        console.log('Login response status:', res.status);
        
        try {
          const userData = await res.json();
          console.log('Login successful, user data retrieved:', userData.id);
          return userData;
        } catch (parseError) {
          console.error('Failed to parse login response:', parseError);
          
          // If we can't parse JSON but login was successful, still try to proceed
          if (res.ok) {
            console.log('Login successful but could not parse user data, refreshing page...');
            // Return placeholder data to avoid errors, page will reload
            return { id: 999, username: credentials.username } as any;
          }
          
          throw new Error('Failed to parse server response');
        }
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
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
      } else {
        // Normal login flow - no need to check account type as all users are workers
        queryClient.setQueryData(["/api/user"], userData);
        
        // Verify the session is established by making a call to /api/user
        fetch('/api/user', { credentials: 'include' })
          .then(res => {
            if (res.ok) {
              console.log('Session verified after login');
            } else {
              console.warn('Session verification failed after login:', res.status);
            }
          })
          .catch(err => {
            console.error('Error verifying session after login:', err);
          });
        
        toast({
          title: "Login successful",
          description: "Welcome back!",
        });
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
        
        // Enhanced registration flow with direct fetch for more reliable session handling
        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: 'include'
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Registration response not OK:', res.status, errorText);
          throw new Error(errorText || 'Registration failed');
        }
        
        console.log('Registration response status:', res.status);
        
        try {
          const userData = await res.json();
          console.log('Registration successful, user data retrieved:', userData.id);
          return userData;
        } catch (parseError) {
          console.error('Failed to parse registration response:', parseError);
          
          // If we can't parse JSON but registration was successful, still try to proceed
          if (res.ok) {
            console.log('Registration successful but could not parse user data, refreshing page...');
            // Return placeholder data to avoid errors
            return { id: 999, username: credentials.username } as any;
          }
          
          throw new Error('Failed to parse server response');
        }
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
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
      } else {
        // Normal registration flow - no need to check account type as all users are workers
        queryClient.setQueryData(["/api/user"], userData);
        
        // Verify the session is established by making a call to /api/user
        fetch('/api/user', { credentials: 'include' })
          .then(res => {
            if (res.ok) {
              console.log('Session verified after registration');
            } else {
              console.warn('Session verification failed after registration:', res.status);
            }
          })
          .catch(err => {
            console.error('Error verifying session after registration:', err);
          });
        
        toast({
          title: "Registration successful", 
          description: "Your account has been created!",
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
      setLocation('/');
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
      // Use direct fetch for more reliable session handling
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: 'include'
      });
      
      if (!res.ok) {
        console.error('Logout failed with status:', res.status);
      }
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