import { createContext, ReactNode, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { toastSuccess, toastError } from "@/lib/toast-utils";

// Define an interface for the notification context
interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: number) => void;
  refreshNotifications: () => void;
}

// Create the context
export const NotificationContext = createContext<NotificationContextType | null>(null);

// Context provider component
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Query for notifications
  const {
    data: notifications = [],
    error,
    isLoading,
    refetch
  } = useQuery<Notification[], Error>({
    queryKey: ['/api/notifications'],
    // Only fetch if user is authenticated
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds to keep notifications up to date
  });
  
  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.isRead).length;
  
  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return await res.json() as Notification;
    },
    onSuccess: () => {
      // Refetch notifications after marking as read
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toastError(toast, "Failed to mark notification as read", error.message);
    }
  });
  
  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/notifications/mark-all-read`);
      return await res.json();
    },
    onSuccess: (data) => {
      toastSuccess(toast, "Notifications marked as read", `${data.count} notifications marked as read`);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toastError(toast, "Failed to mark all notifications as read", error.message);
    }
  });
  
  // Mutation to delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/notifications/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: Error) => {
      toastError(toast, "Failed to delete notification", error.message);
    }
  });
  
  // Function to mark a notification as read
  const markAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };
  
  // Function to mark all notifications as read
  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };
  
  // Function to delete a notification
  const deleteNotification = (id: number) => {
    deleteNotificationMutation.mutate(id);
  };
  
  // Function to manually refresh notifications
  const refreshNotifications = () => {
    refetch();
  };
  
  // Return the provider with the context value
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}