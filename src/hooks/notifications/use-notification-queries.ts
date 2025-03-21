
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { NotificationItemProps } from "@/components/notifications/NotificationItem";
import { transformNotification } from "./utils";

/**
 * Interface for notification query options
 */
interface NotificationQueryOptions {
  staleTime?: number;
  pollingInterval?: number;
  limit?: number;
}

/**
 * Hook for fetching notifications data with optimized caching
 */
export function useNotificationQueries(options: NotificationQueryOptions = {}) {
  const { 
    staleTime = 30000, // Default stale time of 30s
    pollingInterval = 30000, // Default polling of 30s
    limit = 50 // Default limit
  } = options;

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("client_alerts")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .limit(limit);

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
    staleTime: staleTime, // Use configurable stale time
    refetchInterval: pollingInterval, // Configure polling interval
  });

  const unreadCount = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: fetchUnreadCount,
    staleTime: staleTime, // Use configurable stale time
    refetchInterval: pollingInterval, // Configure polling interval
  });

  return {
    notifications: notifications.data || [],
    isLoading: notifications.isLoading,
    unreadCount: unreadCount.data || 0,
    refetch: notifications.refetch,
  };
}
