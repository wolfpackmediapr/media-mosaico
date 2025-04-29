
import React, { useEffect } from "react";
import { NotificationPopover as CustomNotificationPopover } from "@/components/ui/notification/notification-popover";
import { useNotificationPopover } from "@/hooks/notifications";
// Removed unused imports related to the removed listener
// import { useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/integrations/supabase/client";
// import { useNotificationSound } from "./hooks/use-notification-sound";
// import { useNotificationDeduplication } from "./hooks/use-notification-deduplication";

export function NotificationPopover() {
  const {
    notifications,
    unreadCount, // unreadCount is fetched here but not used directly in the UI component itself, kept for context
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead // handleMarkAllAsRead is fetched but not used by CustomNotificationPopover props, kept for context
  } = useNotificationPopover();

  // Removed the redundant useEffect block that listened for real-time updates.
  // RealTimeAlertsProvider handles this globally now.

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
      showViewAll={true} // Assuming this prop controls a "View All" link/button
      // Pass unread count if the component uses it directly (check CustomNotificationPopover definition)
      // unreadCount={unreadCount}
      // Pass markAllAsRead if the component uses it (check CustomNotificationPopover definition)
      // onMarkAllRead={handleMarkAllAsRead}
    />
  );
}
