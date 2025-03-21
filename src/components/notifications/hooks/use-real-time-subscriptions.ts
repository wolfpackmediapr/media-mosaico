
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
    console.log("Refreshing notification queries...");
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
          
          if (!shouldShowNotification(notificationId)) return;
          
          // Determine alert importance for styling
          const isUrgent = alert.importance_level >= 4 || alert.priority === 'urgent';
          
          // Get client name from metadata if available
          const clientName = alert.metadata?.clientName || "Cliente";
          
          const title = isUrgent 
            ? `¡Alerta importante para ${clientName}!` 
            : `Notificación para ${clientName}`;
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcriptions"
        },
        (payload) => {
          console.log("New transcription detected:", payload);
          const newItem = payload.new;
          const notificationId = `transcription-${newItem.id}`;
          
          if (!shouldShowNotification(notificationId)) return;
          
          const title = "Nueva transcripción completada";
          const description = `Se ha completado una transcripción para ${newItem.program || newItem.channel || 'contenido multimedia'}`;
          
          toast.success(title, {
            description,
            id: notificationId
          });
          
          playNotificationSound();
          showBrowserNotification(title, description);
          
          // Refresh notifications to update the UI
          refreshNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "press_clippings"
        },
        (payload) => {
          console.log("New press clipping detected:", payload);
          const newItem = payload.new;
          const notificationId = `press-${newItem.id}`;
          
          if (!shouldShowNotification(notificationId)) return;
          
          const title = "Nuevo recorte de prensa";
          const description = `${newItem.title} - ${newItem.publication_name}`;
          
          toast.success(title, {
            description,
            id: notificationId
          });
          
          playNotificationSound();
          showBrowserNotification(title, description);
          
          // Refresh notifications to update the UI
          refreshNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news_articles"
        },
        (payload) => {
          console.log("New news article detected:", payload);
          const newItem = payload.new;
          const notificationId = `news-${newItem.id}`;
          
          if (!shouldShowNotification(notificationId)) return;
          
          const title = "Nueva noticia";
          const description = `${newItem.title} - ${newItem.source}`;
          
          toast.success(title, {
            description,
            id: notificationId
          });
          
          playNotificationSound();
          showBrowserNotification(title, description);
          
          // Refresh notifications to update the UI
          refreshNotifications();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });
    
    // Cleanup subscription when component unmounts
    return () => {
      console.log("Cleaning up real-time notification listeners");
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound, shouldShowNotification]);

  return { refreshNotifications };
}
