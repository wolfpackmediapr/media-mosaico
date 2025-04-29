
import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setupNotificationListener } from "@/services/notifications/unifiedNotificationService";

interface NotificationAlertsOptions {
  enableRealtime?: boolean;
}

/**
 * Hook for handling real-time notification alerts
 */
export function useNotificationAlerts(options: NotificationAlertsOptions = {}) {
  const { enableRealtime = true } = options;
  const queryClient = useQueryClient();

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

    // Setup unified notification listener
    const unsubscribe = setupNotificationListener((notification) => {
      // Play sound
      playNotificationSound();
      
      // Show browser notification
      showBrowserNotification(
        notification.title,
        notification.description || "Nueva notificación recibida"
      );
      
      // Refresh notifications data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    });

    return () => {
      unsubscribe();
    };
  }, [enableRealtime, queryClient, playNotificationSound, showBrowserNotification]);

  return {
    playNotificationSound,
    showBrowserNotification
  };
}
