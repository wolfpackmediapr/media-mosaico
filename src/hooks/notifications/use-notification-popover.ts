
import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";

export function useNotificationPopover() {
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

  return {
    isOpen,
    toggleOpen,
    notifications,
    unreadCount,
    isLoading,
    handleMarkAsRead,
    handleMarkAllAsRead
  };
}
