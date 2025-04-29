
import { useNotificationQueries } from "./use-notification-queries";
import { useNotificationMutations } from "./use-notification-mutations";
import { useNotificationAlerts } from "./use-notification-alerts";
import { useNotificationPopover } from "./use-notification-popover";
import { NotificationAlert } from "./types";
import { transformNotification } from "./utils";

/**
 * Main hook combining all notification functionality
 */
export function useNotifications(options: { enableRealtime?: boolean } = {}) {
  const { notifications, isLoading, unreadCount, refetch } = useNotificationQueries();
  const { markAsRead, markAllAsRead, markAsArchived } = useNotificationMutations();
  useNotificationAlerts(options);

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markAsArchived,
    refetch,
  };
}

export {
  useNotificationPopover,
  transformNotification 
};

export type { NotificationAlert };
