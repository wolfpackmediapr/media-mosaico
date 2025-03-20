
import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function useRealTimeAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/notification-sound.mp3");
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

  // Setup real-time subscription for alerts
  useEffect(() => {
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
          
          // Show toast notification
          const alert = payload.new;
          const clientName = alert.client_name || "Cliente";
          const summary = alert.summary || alert.title || "Nueva alerta";
          
          // Add the metadata category if available
          const category = alert.metadata?.category ? ` - ${alert.metadata.category}` : "";
          
          toast({
            title: `¡Nueva alerta para ${clientName}!${category}`,
            description: summary,
            variant: "default",
          });
          
          // Show browser notification
          showBrowserNotification(
            `¡Nueva alerta para ${clientName}!${category}`,
            summary
          );
          
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
          
          // Don't show a toast for every segment, but invalidate the queries
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
          
          toast({
            title: "Nuevo contenido de prensa",
            description: payload.new.title || "Contenido procesado y listo para consulta",
            variant: "default",
          });
          
          queryClient.invalidateQueries({ queryKey: ["press-clippings"] });
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound, showBrowserNotification, toast]);

  return {
    // You can add methods here if needed for manual alert creation
    createManualAlert: (clientId: string, title: string, description: string) => {
      // Logic for creating a manual alert could be added here
      console.log("Manual alert creation not yet implemented", { clientId, title, description });
    }
  };
}
