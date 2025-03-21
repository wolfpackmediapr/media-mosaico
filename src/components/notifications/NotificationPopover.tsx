
import React from "react";
import { NotificationPopover as CustomNotificationPopover } from "@/components/ui/notification-popover";
import { useNotificationPopover } from "@/hooks/notifications";

export function NotificationPopover() {
  const {
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead
  } = useNotificationPopover();

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
    />
  );
}
