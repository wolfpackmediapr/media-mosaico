
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

  // Setup real-time subscription for transcriptions
  useEffect(() => {
    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("media-content-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_alerts"
        },
        (payload) => {
          console.log("New media alert received:", payload);
          
          // Play sound
          playNotificationSound();
          
          // Show toast notification
          const newAlert = payload.new;
          const clientName = newAlert.clients?.name || "Cliente";
          const category = newAlert.metadata?.category || "";
          const sourceType = getSourceTypeDisplay(newAlert.content_type);
          
          toast({
            title: `¡Nueva alerta de ${sourceType}!`,
            description: `${newAlert.title} - Relevante para ${clientName} ${category ? `(${category})` : ""}`,
            variant: newAlert.priority === "urgent" ? "destructive" : "default",
          });
          
          // Show browser notification
          showBrowserNotification(
            `¡Nueva alerta de ${sourceType}!`,
            `${newAlert.title} - Relevante para ${clientName}`
          );
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
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
          
          // Show a more subtle toast for new content
          toast({
            title: "Nuevo contenido de prensa procesado",
            description: payload.new.title || "Contenido procesado y listo para consulta",
            variant: "default",
          });
          
          queryClient.invalidateQueries({ queryKey: ["press-clippings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, playNotificationSound, showBrowserNotification, toast]);

  return {
    // You can add methods here if needed for manual alert creation
    createManualAlert: (clientId: string, title: string, description: string, priority: string = "medium") => {
      // Logic to create a manual alert
    }
  };
}

// Helper function to get a display name for the content type
function getSourceTypeDisplay(contentType: string | null): string {
  switch (contentType) {
    case "news": return "Noticias";
    case "social": return "Redes Sociales";
    case "radio": return "Radio";
    case "tv": return "TV";
    case "press": return "Prensa";
    default: return "Contenido";
  }
}
