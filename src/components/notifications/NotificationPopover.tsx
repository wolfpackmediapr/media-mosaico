
import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import NotificationDot from "./NotificationDot";
import { formatDistanceToNow } from "date-fns";

export type NotificationItem = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  status: "unread" | "read" | "archived";
  importance: number;
  clientName?: string | null;
  clientId?: string | null;
  keywords?: string[];
};

interface NotificationItemProps {
  notification: NotificationItem;
  index: number;
  onMarkAsRead: (id: string) => void;
  textColor?: string;
  hoverBgColor?: string;
}

const NotificationItemComponent = ({
  notification,
  index,
  onMarkAsRead,
  textColor = "text-foreground",
  hoverBgColor = "hover:bg-accent",
}: NotificationItemProps) => (
  <motion.div
    initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
    transition={{ duration: 0.3, delay: index * 0.1 }}
    key={notification.id}
    className={cn(`p-3 ${hoverBgColor} cursor-pointer transition-colors rounded-md`)}
    onClick={() => onMarkAsRead(notification.id)}
  >
    <div className="relative flex items-start pe-3">
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-start">
          <h4 className={`text-sm font-medium ${textColor}`}>
            {notification.title}
          </h4>
          
          <span className="text-xs text-muted-foreground ml-2">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        {notification.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.description}
          </p>
        )}
        
        {notification.clientName && (
          <div className="flex items-center mt-1">
            <Badge variant="outline" className="text-xs">
              {notification.clientName}
            </Badge>
          </div>
        )}
      </div>
      
      {notification.status === "unread" && (
        <div className="absolute end-0 self-center">
          <span className="sr-only">No leído</span>
          <NotificationDot className="text-primary" />
        </div>
      )}
    </div>
  </motion.div>
);

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

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    // We don't need to close the popover when marking a single notification as read
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Close popover when clicking outside
  useEffect(() => {
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
    <div className="relative">
      <Button
        onClick={toggleOpen}
        variant="outline"
        size="icon"
        className="relative"
        aria-label="Abrir notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="notification-popover-content absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-lg border border-border bg-background shadow-lg z-50"
          >
            <div className="p-3 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-semibold">Notificaciones</h3>
              <Button
                onClick={handleMarkAllAsRead}
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={unreadCount === 0}
              >
                Marcar todo como leído
              </Button>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Cargando notificaciones...
              </div>
            ) : (
              <NotificationList
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
              />
            )}
            
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
}
