
import { NotificationItemProps } from "@/components/notifications/NotificationItem";

/**
 * Transform database notification to UI format
 */
export function transformNotification(notification: any): Omit<NotificationItemProps, "onClick"> {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.description,
    createdAt: notification.created_at,
    status: notification.status || "unread",
    importance: notification.importance_level || 
      (notification.priority === "urgent" ? 5 : 
       notification.priority === "high" ? 4 : 
       notification.priority === "medium" ? 3 : 2),
    clientId: notification.client_id || null,
    clientName: notification.clients?.name || null,
    keywords: notification.keyword_matched || []
  };
}
