
import { useCallback, useEffect } from "react";

interface NotificationAlertsOptions {
  enableRealtime?: boolean; // Keep option for backward compatibility, but not used
}

/**
 * Hook for handling notification alert side-effects like sound and browser notifications.
 * Real-time data fetching/invalidation is now handled globally by RealTimeAlertsProvider.
 */
export function useNotificationAlerts(options: NotificationAlertsOptions = {}) {
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
          // Request permission if not denied
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
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

  // No longer setting up notification listeners here - RealTimeAlertsProvider handles this

  return {
    playNotificationSound,
    showBrowserNotification
  };
}
