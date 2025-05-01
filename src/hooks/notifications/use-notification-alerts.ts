
import { useCallback, useEffect } from "react";
// Remove the unused import: import { useQueryClient } from "@tanstack/react-query";
// import { setupNotificationListener } from "@/services/notifications/unifiedNotificationService"; - Removed this import

interface NotificationAlertsOptions {
  enableRealtime?: boolean; // Keep option for potential future use, though listener is global now
}

/**
 * Hook for handling notification alert side-effects like sound and browser notifications.
 * Real-time data fetching/invalidation is handled globally by RealTimeAlertsProvider.
 */
export function useNotificationAlerts(options: NotificationAlertsOptions = {}) {
  // const { enableRealtime = true } = options; // enableRealtime is no longer used here
  // const queryClient = useQueryClient(); // queryClient is no longer used here

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.5; // Lower volume to be less intrusive
      audio.play().catch((e) => console.log("No se pudo reproducir el sonido de notificación", e));
    } catch (error) {
      console.error("Error reproduciendo sonido de notificación:", error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
          // Request permission if not denied, but don't wait here.
          // RealTimeAlertsProvider should handle initial permission request.
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              // We might want to store the notification details temporarily
              // and show it if permission is granted later, but for simplicity,
              // we'll only show it if permission was already granted.
              console.log("Permiso de notificación de navegador concedido después de solicitarlo.");
            }
          });
        }
      }
    } catch (error) {
      console.error("Error mostrando notificación del navegador:", error);
    }
  }, []);

  // Request browser notification permission on mount if default
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
  }, []);

  // Removed the useEffect block that called setupNotificationListener
  // as real-time listening is handled globally by RealTimeAlertsProvider / useRealTimeSubscriptions

  return {
    playNotificationSound,
    showBrowserNotification
  };
}
