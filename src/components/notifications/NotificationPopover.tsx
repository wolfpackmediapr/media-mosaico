
import React, { useEffect } from "react";
import { NotificationPopover as CustomNotificationPopover } from "@/components/ui/notification/notification-popover";
import { useNotificationPopover } from "@/hooks/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSound } from "./hooks/use-notification-sound";
import { useNotificationDeduplication } from "./hooks/use-notification-deduplication";

export function NotificationPopover() {
  const {
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead
  } = useNotificationPopover();
  
  const queryClient = useQueryClient();
  const { playNotificationSound } = useNotificationSound();
  const { shouldShowNotification } = useNotificationDeduplication();

  // Setup real-time listener for new notifications to update the bell icon immediately
  useEffect(() => {
    const channel = supabase
      .channel("notification-bell-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_alerts"
        },
        (payload) => {
          console.log("New notification received in bell icon:", payload);
          
          // Play notification sound if not a duplicate
          const notificationId = `bell-${payload.new.id}`;
          if (shouldShowNotification(notificationId)) {
            playNotificationSound();
          }
          
          // Use cache-optimized invalidation
          queryClient.invalidateQueries({
            queryKey: ["notifications"],
            // Don't refetch immediately, wait for the next interval
            refetchType: "inactive"
          });
          
          queryClient.invalidateQueries({
            queryKey: ["notifications", "unread"],
            // Don't refetch immediately, wait for the next interval
            refetchType: "inactive"
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound, shouldShowNotification]);

  // Transform notifications to the format expected by CustomNotificationPopover
  const transformedNotifications = notifications.map(notification => ({
    id: notification.id,
    title: notification.title,
    description: notification.description || "",
    timestamp: new Date(notification.createdAt),
    read: notification.status !== "unread"
  }));

  return (
    <CustomNotificationPopover 
      notifications={transformedNotifications}
      onNotificationsChange={(updatedNotifications) => {
        // When a notification is marked as read in the custom component,
        // trigger the original handler
        const changedNotification = updatedNotifications.find(
          (n, i) => n.read && !transformedNotifications[i].read
        );
        
        if (changedNotification) {
          handleMarkAsRead(changedNotification.id);
        }
      }}
      showViewAll={true}
    />
  );
}
