
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { NotificationItemProps } from "@/components/notifications/NotificationItem";
import { transformNotification } from "./utils";

/**
 * Hook for fetching notifications data
 */
export function useNotificationQueries() {
  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("client_alerts")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []).map(transformNotification);
  };

  const fetchUnreadCount = async () => {
    const { count, error } = await supabase
      .from("client_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread");

    if (error) throw error;
    return count || 0;
  };

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const unreadCount = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: fetchUnreadCount,
  });

  return {
    notifications: notifications.data || [],
    isLoading: notifications.isLoading,
    unreadCount: unreadCount.data || 0,
    refetch: notifications.refetch,
  };
}
