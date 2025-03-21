
import React from "react";
import NotificationItemComponent from "./NotificationItemComponent";
import { NotificationItem } from "./types";

interface NotificationListProps {
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
}

const NotificationList = ({
  notifications,
  onMarkAsRead,
  textColor,
  hoverBgColor,
}: NotificationListProps) => (
  <div className="space-y-1 p-1">
    {notifications.length === 0 ? (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No hay notificaciones nuevas
      </div>
    ) : (
      notifications.map((notification, index) => (
        <NotificationItemComponent
          key={notification.id}
          notification={notification}
          index={index}
          onMarkAsRead={onMarkAsRead}
          textColor={textColor}
          hoverBgColor={hoverBgColor}
        />
      ))
    )}
  </div>
);

export default NotificationList;
