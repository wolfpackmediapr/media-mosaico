
import { NotificationAlert } from "./types";
import { NotificationItem } from "@/components/notifications/types";

/**
 * Transform a notification from Supabase to the format used in the UI
 */
export const transformNotification = (notification: any): NotificationItem => {
  try {
    // Extract client name from either the clients join result or from metadata
    const clientName = notification.clients?.name || 
                        notification.metadata?.clientName || 
                        notification.client_name || 
                        null;
                        
    // Handle potential missing fields gracefully
    return {
      id: notification.id,
      title: notification.title || "Untitled notification",
      description: notification.description,
      createdAt: notification.created_at || new Date().toISOString(),
      status: notification.status || "unread",
      importance: notification.importance_level || 3,
      clientName: clientName,
      clientId: notification.client_id,
      keywords: notification.keyword_matched || []
    };
  } catch (error) {
    console.error("Error transforming notification:", error, notification);
    
    // Return a fallback notification to prevent UI errors
    return {
      id: notification.id || "error-id",
      title: "Error displaying notification",
      description: "There was a problem processing this notification",
      createdAt: new Date().toISOString(),
      status: "unread",
      importance: 1,
      clientId: null
    };
  }
};
