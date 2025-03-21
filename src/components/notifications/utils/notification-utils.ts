
/**
 * Utilities for notification sounds and browser notifications
 */

// Play notification sound
export const playNotificationSound = () => {
  try {
    const audio = new Audio("/notification-sound.mp3");
    audio.volume = 0.5; // Lower volume to be less intrusive
    audio.play().catch((e) => console.log("Could not play notification sound", e));
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

// Show browser notification if permitted
export const showBrowserNotification = (title: string, body: string) => {
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
};

// Request browser notification permission
export const requestNotificationPermission = () => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
};
