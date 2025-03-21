
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealTimeAlertsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up real-time notification alerts
 * Should be mounted near the root of the application
 */
const RealTimeAlertsProvider: React.FC<RealTimeAlertsProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Set up notification listeners for various content types
    const channel = supabase
      .channel("real-time-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transcriptions"
        },
        (payload) => {
          console.log("New transcription:", payload);
          const newItem = payload.new;
          
          toast.success("Nueva transcripción", {
            description: `Se ha completado una transcripción para ${newItem.program || newItem.channel || 'contenido multimedia'}`,
            id: `transcription-${newItem.id}`
          });
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
          console.log("New press clipping:", payload);
          const newItem = payload.new;
          
          toast.success("Nuevo recorte de prensa", {
            description: `${newItem.title} - ${newItem.publication_name}`,
            id: `press-${newItem.id}`
          });
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
          console.log("New news article:", payload);
          const newItem = payload.new;
          
          toast.success("Nueva noticia", {
            description: `${newItem.title} - ${newItem.source}`,
            id: `news-${newItem.id}`
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_alerts"
        },
        (payload) => {
          console.log("New client alert:", payload);
          const alert = payload.new;
          
          // Determine alert importance for styling
          const isUrgent = alert.importance_level >= 4 || alert.priority === 'urgent';
          
          // Get client name from metadata if available
          const clientName = alert.metadata?.clientName || "Cliente";
          
          if (isUrgent) {
            toast.error(`¡Alerta importante para ${clientName}!`, {
              description: alert.description || alert.title,
              id: `alert-${alert.id}`,
              duration: 6000 // Show urgent alerts longer
            });
          } else {
            toast.info(`Notificación para ${clientName}`, {
              description: alert.description || alert.title,
              id: `alert-${alert.id}`
            });
          }
        }
      )
      .subscribe();
    
    // Play notification sound
    const playNotificationSound = () => {
      try {
        const audio = new Audio("/notification-sound.mp3");
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Could not play notification sound", e));
      } catch (error) {
        console.error("Error playing notification sound:", error);
      }
    };

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  if (!mounted) return <>{children}</>;
  
  return <>{children}</>;
};

export default RealTimeAlertsProvider;
