
/**
 * Whether the browser exposes the Notification API.
 * Safari on iOS/iPadOS (and some in-app webviews) do not define the global at all,
 * so any bare reference to `Notification` throws a ReferenceError.
 */
export const hasNotificationApi = (): boolean =>
  typeof window !== "undefined" && typeof Notification !== "undefined";

/**
 * Request permission for browser notifications.
 * Resolves to false on browsers without the Notification API.
 */
export const requestNotificationPermission = (): Promise<boolean> => {
  if (!hasNotificationApi()) {
    return Promise.resolve(false);
  }

  try {
    if (Notification.permission === "default") {
      return Notification.requestPermission()
        .then((permission) => {
          console.log(`Notification permission status: ${permission}`);
          return permission === "granted";
        })
        .catch(() => false);
    }
    return Promise.resolve(Notification.permission === "granted");
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return Promise.resolve(false);
  }
};

/**
 * Show a browser notification with proper error handling
 */
export const showBrowserNotification = (title: string, body: string) => {
  try {
    if (hasNotificationApi() && Notification.permission === "granted") {
      new Notification(title, { body });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error showing browser notification:", error);
    return false;
  }
};
