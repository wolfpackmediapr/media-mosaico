
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface NotificationAlertsOptions {
  enableRealtime?: boolean;
  toastCallback?: (title: string, description: string) => void;
}

/**
 * Hook for handling real-time notification alerts
 */
export function useRealTimeAlerts(options: NotificationAlertsOptions = {}) {
  const { enableRealtime = true, toastCallback } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.5; // Lower volume to be less intrusive
      audio.play().catch((e) => console.log("Could not play notification sound", e));
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(title, { body });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error showing browser notification:", error);
    }
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("client-alerts-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_alerts"
        },
        (payload) => {
          console.log("New client alert received:", payload);
          
          // Play sound
          playNotificationSound();
          
          // Get alert details
          const alert = payload.new;
          const clientName = alert.client_name || "Cliente";
          const summary = alert.summary || alert.title || "Nueva alerta";
          
          // Add the metadata category if available
          const category = alert.metadata?.category ? ` - ${alert.metadata.category}` : "";
          
          const title = `¡Nueva alerta para ${clientName}!${category}`;
          
          // Show toast notification
          if (toastCallback) {
            toastCallback(title, summary);
          } else {
            toast({
              title,
              description: summary,
              variant: "default",
            });
          }
          
          // Show browser notification
          showBrowserNotification(title, summary);
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["client-alerts"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news_segments"
        },
        (payload) => {
          console.log("New news segment processed:", payload);
          
          // Invalidate the queries
          queryClient.invalidateQueries({ queryKey: ["news-segments"] });
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
          console.log("New press clipping processed:", payload);
          
          const title = "Nuevo contenido de prensa";
          const description = payload.new.title || "Contenido procesado y listo para consulta";
          
          if (toastCallback) {
            toastCallback(title, description);
          } else {
            toast({
              title,
              description,
              variant: "default",
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ["press-clippings"] });
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
          console.log("New transcription processed:", payload);
          
          const title = "Nueva transcripción completada";
          const description = "El contenido de audio/video ha sido transcrito exitosamente";
          
          if (toastCallback) {
            toastCallback(title, description);
          } else {
            toast({
              title,
              description,
              variant: "default",
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ["transcriptions"] });
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound, showBrowserNotification, toast, toastCallback, enableRealtime]);

  return {
    // You can add methods here if needed for manual alert creation
    createManualAlert: (clientId: string, title: string, description: string) => {
      // Logic for creating a manual alert could be added here
      console.log("Manual alert creation not yet implemented", { clientId, title, description });
    }
  };
}
