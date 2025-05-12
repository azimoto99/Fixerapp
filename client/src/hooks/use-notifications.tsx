import * as React from "react";
import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { toastSuccess, toastError } from "@/lib/toast-utils";

type NotificationsContextType = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Fetch all notifications
  const {
    data: notifications = [],
    isLoading,
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: getQueryFn({ on401: "returnEmptyArray" }),
    staleTime: 1000 * 60, // 1 minute
  });

  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  // Mark a single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('PATCH', `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toastSuccess("Notification marked as read");
    },
    onError: (err: Error) => {
      toastError("Failed to mark notification as read");
      console.error(err);
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toastSuccess("All notifications marked as read");
    },
    onError: (err: Error) => {
      toastError("Failed to mark all notifications as read");
      console.error(err);
    },
  });

  // Delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toastSuccess("Notification deleted");
    },
    onError: (err: Error) => {
      toastError("Failed to delete notification");
      console.error(err);
    },
  });

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead: markAsReadMutation.mutateAsync,
        markAllAsRead: markAllAsReadMutation.mutateAsync,
        deleteNotification: deleteNotificationMutation.mutateAsync,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}