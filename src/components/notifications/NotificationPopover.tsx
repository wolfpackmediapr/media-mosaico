
import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import NotificationList from "./NotificationList";

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
