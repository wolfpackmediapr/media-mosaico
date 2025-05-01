
/**
 * Request permission for browser notifications
 */
export const requestNotificationPermission = () => {
  if ("Notification" in window && Notification.permission === "default") {
    return Notification.requestPermission().then(permission => {
      console.log(`Notification permission status: ${permission}`);
      return permission === "granted";
    });
  }
  return Promise.resolve(Notification.permission === "granted");
};

/**
 * Show a browser notification with proper error handling
 */
export const showBrowserNotification = (title: string, body: string) => {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error showing browser notification:", error);
    return false;
  }
};
