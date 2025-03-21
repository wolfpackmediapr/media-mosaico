
"use client";

import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationList from "./notification-list";
import { NotificationPopoverProps, dummyNotifications } from "./types";

export const NotificationPopover = ({
  notifications: initialNotifications = dummyNotifications,
  onNotificationsChange,
  buttonClassName = "",
  popoverClassName = "bg-background border border-border",
  textColor = "text-foreground",
  hoverBgColor = "hover:bg-accent/50",
  dividerColor = "divide-border",
  headerBorderColor = "border-border",
  showViewAll = false,
}: NotificationPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = 
    useState(initialNotifications);

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
            
            {showViewAll && (
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => window.location.href = "/notificaciones"}
                >
                  Ver todas las notificaciones
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationPopover;
