
import React, { useEffect, useState, useRef } from "react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationTimeRef = useRef<Record<string, number>>({});
  
  // Prevent duplicate notifications within a short timeframe
  const shouldShowNotification = (id: string): boolean => {
    const now = Date.now();
    const lastTime = lastNotificationTimeRef.current[id] || 0;
    
    // Prevent duplicate notifications within 5 seconds
    if (now - lastTime < 5000) {
      console.log(`Suppressing duplicate notification: ${id}`);
      return false;
    }
    
    lastNotificationTimeRef.current[id] = now;
    return true;
  };

  // Initialize audio element for notification sounds
  useEffect(() => {
    try {
      audioRef.current = new Audio("/notification-sound.mp3");
      audioRef.current.volume = 0.5;
      audioRef.current.preload = "auto";
    } catch (error) {
      console.error("Error setting up notification sound:", error);
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        // Clone and play to allow overlapping sounds
        const sound = audioRef.current.cloneNode() as HTMLAudioElement;
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Could not play notification sound", e));
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  // Show browser notification if permitted
  const showBrowserNotification = (title: string, body: string) => {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    } catch (error) {
      console.error("Error showing browser notification:", error);
    }
  };

  useEffect(() => {
    setMounted(true);
    console.log("Setting up real-time notification listeners");
    
    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    
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
  }, []);
  
  if (!mounted) return <>{children}</>;
  
  return <>{children}</>;
};

export default RealTimeAlertsProvider;
