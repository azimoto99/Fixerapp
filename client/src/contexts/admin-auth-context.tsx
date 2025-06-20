import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  adminToken: string | null;
  adminPermissions: string[];
  validateAdminAccess: () => Promise<boolean>;
  error: string | null;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === null) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);

  // Validate admin access on component mount and when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        setError(null);
        setAdminToken(null);
        setAdminPermissions([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // First, check if user has admin privileges in the user object
        const hasAdminPrivilege = user.isAdmin || user.id === 20;

        if (!hasAdminPrivilege) {
          setIsAdmin(false);
          setAdminToken(null);
          setAdminPermissions([]);
          setIsLoading(false);
          return;
        }

        // Then, validate admin access with the server
        const response = await apiRequest('GET', '/api/admin/validate-token');
        const data = await response.json();

        if (data.isValid) {
          setIsAdmin(true);
          setAdminToken(data.token || null);
          setAdminPermissions(data.permissions || []);
        } else {
          setIsAdmin(false);
          setAdminToken(null);
          setAdminPermissions([]);
          setError('Admin validation failed. Please log in again.');
        }
      } catch (err) {
        console.error('Admin validation error:', err);
        setIsAdmin(user.isAdmin || user.id === 20); // Fallback to basic client-side check
        setError('Error validating admin access');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Function to validate admin access explicitly
  const validateAdminAccess = async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest('GET', '/api/admin/validate-token');
      const data = await response.json();

      setIsAdmin(data.isValid);
      setAdminToken(data.token || null);
      setAdminPermissions(data.permissions || []);
      
      return data.isValid;
    } catch (error) {
      console.error('Admin validation error:', error);
      setError('Error validating admin access');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to log out of admin panel
  const logout = () => {
    setIsAdmin(false);
    setAdminToken(null);
    setAdminPermissions([]);
  };

  const contextValue: AdminAuthContextType = {
    isAdmin,
    isLoading,
    adminToken,
    adminPermissions,
    validateAdminAccess,
    error,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
} 