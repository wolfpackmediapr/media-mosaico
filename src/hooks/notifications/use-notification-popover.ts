
import { useEffect } from "react";
import { useNotificationQueries } from "./use-notification-queries";
import { useNotificationMutations } from "./use-notification-mutations";
import { useNotificationAlerts } from "./use-notification-alerts";

/**
 * Hook for the notification popover component
 */
export function useNotificationPopover() {
  const { notifications, isLoading, unreadCount, refetch } = useNotificationQueries({
    // Configure with longer staleTime to reduce unnecessary fetches
    staleTime: 120000, // 2 minutes
    // Reduce polling frequency for better performance
    pollingInterval: 120000 // 2 minute polling 
  });
  
  const { markAsRead, markAllAsRead } = useNotificationMutations();
  
  // Setup notification alerts
  useNotificationAlerts();
  
  // Auto-refresh notifications when component mounts
  useEffect(() => {
    // Initial fetch
    refetch();
    
    // Set up polling with reduced frequency
    const intervalId = setInterval(() => {
      refetch();
    }, 120000); // Poll every 2 minutes 
    
    return () => clearInterval(intervalId);
  }, [refetch]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead,
  };
}
