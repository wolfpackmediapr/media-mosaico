
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationDeduplication } from "./use-notification-deduplication";
import { useNotificationSound } from "./use-notification-sound";
import { showBrowserNotification, requestNotificationPermission } from "../utils/notification-utils";

/**
 * Hook for managing real-time alert subscriptions
 */
export function useRealTimeSubscriptions() {
  const { shouldShowNotification } = useNotificationDeduplication();
  const { playNotificationSound } = useNotificationSound();
  const queryClient = useQueryClient();
  
  // Refresh notifications
  const refreshNotifications = () => {
    console.log("Updating notification queries...");
    // Invalidate all notification-related queries
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-feed"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
  };

  useEffect(() => {
    console.log("Setting up real-time notification listeners");
    
    // Request browser notification permission
    requestNotificationPermission();
    
    // Set up notification listeners for the client_alerts table
    const channel = supabase
      .channel("real-time-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_alerts"
        },
        (payload) => {
          console.log("New client alert detected:", payload);
          const alert = payload.new;
          const notificationId = `alert-${alert.id}`;
          
          if (!shouldShowNotification(notificationId, 10000)) return;
          
          // Determine alert importance for styling
          const isUrgent = alert.importance_level >= 4 || alert.priority === 'urgent';
          
          // Get client name from metadata if available
          const clientName = alert.metadata?.clientName || "Client";
          
          const title = isUrgent 
            ? `¡Important alert for ${clientName}!` 
            : `Notification for ${clientName}`;
          const description = alert.description || alert.title;
          
          if (isUrgent) {
            toast.error(title, {
              description,
              id: notificationId,
              duration: 6000 // Show urgent alerts longer
            });
          } else {
            toast.info(title, {
              description,
              id: notificationId
            });
          }
          
          playNotificationSound();
          showBrowserNotification(title, description);
          
          // Refresh notifications to update the UI
          refreshNotifications();
        }
      )
      .subscribe((status) => {
        console.log("Real-time subscription status:", status);
      });
    
    // Cleanup subscription when component unmounts
    return () => {
      console.log("Cleaning up real-time notification listeners");
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound, shouldShowNotification]);

  return { refreshNotifications };
}
