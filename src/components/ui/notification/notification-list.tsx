
import React from "react";
import { NotificationListProps } from "./types";
import NotificationItem from "./notification-item";

export const NotificationList = ({
  notifications,
  onMarkAsRead,
  textColor,
  hoverBgColor,
  dividerColor = "divide-border",
}: NotificationListProps) => (
  <div className={`divide-y ${dividerColor}`}>
    {notifications.length > 0 ? (
      notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          index={index}
          onMarkAsRead={onMarkAsRead}
          textColor={textColor}
          hoverBgColor={hoverBgColor}
        />
      ))
    ) : (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No hay notificaciones
      </div>
    )}
  </div>
);

export default NotificationList;
