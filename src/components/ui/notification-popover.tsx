
"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
};

interface NotificationItemProps {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
  dotColor?: string;
}

const NotificationItem = ({
  notification,
  index,
  onMarkAsRead,
  textColor = "text-foreground",
  dotColor = "text-primary",
  hoverBgColor = "hover:bg-accent/50",
}: NotificationItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    key={notification.id}
    className={cn(`p-4 ${hoverBgColor} cursor-pointer transition-colors`)}
    onClick={() => onMarkAsRead(notification.id)}
  >
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-2">
        {!notification.read && (
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        )}
        <h4 className={`text-sm font-medium ${textColor}`}>
          {notification.title}
        </h4>
      </div>

      <span className={`text-xs text-muted-foreground`}>
        {notification.timestamp.toLocaleDateString()}
      </span>
    </div>
    <p className={`text-xs text-muted-foreground mt-1`}>
      {notification.description}
    </p>
  </motion.div>
);

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
  dividerColor?: string;
}

const NotificationList = ({
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

interface NotificationPopoverProps {
  notifications?: Notification[];
  onNotificationsChange?: (notifications: Notification[]) => void;
  buttonClassName?: string;
  popoverClassName?: string;
  textColor?: string;
  hoverBgColor?: string;
  dividerColor?: string;
  headerBorderColor?: string;
}

// Default notifications for demo purposes
const dummyNotifications: Notification[] = [
  {
    id: "1",
    title: "Nueva alerta",
    description: "Se ha detectado una mención importante",
    timestamp: new Date(),
    read: false,
  },
  {
    id: "2",
    title: "Actualización del sistema",
    description: "Mantenimiento programado para mañana",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: "3",
    title: "Recordatorio",
    description: "Reunión con el equipo a las 14:00",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
  },
];

export const NotificationPopover = ({
  notifications: initialNotifications = dummyNotifications,
  onNotificationsChange,
  buttonClassName = "",
  popoverClassName = "bg-background border border-border",
  textColor = "text-foreground",
  hoverBgColor = "hover:bg-accent/50",
  dividerColor = "divide-border",
  headerBorderColor = "border-border",
}: NotificationPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = 
    useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleOpen = () => setIsOpen(!isOpen);

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map((n) => ({
      ...n,
      read: true,
    }));
    setNotifications(updatedNotifications);
    onNotificationsChange?.(updatedNotifications);
  };

  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    onNotificationsChange?.(updatedNotifications);
  };

  // Close popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.notification-popover-content')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${textColor}`}>
      <Button
        onClick={toggleOpen}
        variant="outline"
        size="icon"
        className={cn("relative", buttonClassName)}
        aria-label="Abrir notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs px-1 text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "notification-popover-content absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-lg shadow-lg z-50",
              popoverClassName
            )}
          >
            <div
              className={`p-3 border-b ${headerBorderColor} flex justify-between items-center`}
            >
              <h3 className="text-sm font-semibold">Notificaciones</h3>
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={unreadCount === 0}
              >
                Marcar todo como leído
              </Button>
            </div>

            <NotificationList
              notifications={notifications}
              onMarkAsRead={markAsRead}
              textColor={textColor}
              hoverBgColor={hoverBgColor}
              dividerColor={dividerColor}
            />
            
            <div className="p-2 border-t border-border">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => window.location.href = "/notificaciones"}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
