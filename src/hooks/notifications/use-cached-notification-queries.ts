
import { supabase } from "@/integrations/supabase/client";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { NotificationItemProps } from "@/components/notifications/NotificationItem";
import { transformNotification } from "./utils";

/**
 * Enhanced notification query options with optimized caching
 */
interface CachedNotificationQueryOptions {
  /** Time until data is considered stale (in milliseconds) */
  staleTime?: number;
  /** How often to poll for new data (in milliseconds) */
  pollingInterval?: number;
  /** Maximum number of notifications to fetch */
  limit?: number;
  /** Whether to enable background fetching */
  enableBackgroundFetching?: boolean;
  /** Custom query options */
  queryOptions?: Omit<UseQueryOptions<NotificationItemProps[], Error>, 'queryKey' | 'queryFn'>;
}

/**
 * Hook for fetching notifications with optimized caching strategies
 * 
 * Features:
 * - Configurable stale time
 * - Configurable polling
 * - Deduplication of requests
 * - Smart background refetching
 */
export function useCachedNotificationQueries(options: CachedNotificationQueryOptions = {}) {
  const { 
    staleTime = 60000, // Default stale time of 1 minute
    pollingInterval = 30000, // Default polling of 30s
    limit = 50, // Default limit
    enableBackgroundFetching = true,
    queryOptions = {}
  } = options;

  // Fetch notifications with proper caching
  const fetchNotifications = async () => {
    console.log("Fetching notifications from API");
    
    const { data, error } = await supabase
      .from("client_alerts")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(transformNotification);
  };

  // Fetch unread count with proper caching
  const fetchUnreadCount = async () => {
    console.log("Fetching unread count from API");
    
    const { count, error } = await supabase
      .from("client_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread");

    if (error) throw error;
    return count || 0;
  };

  // Use React Query with optimized settings
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: staleTime,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: enableBackgroundFetching,
    ...queryOptions
  });

  // Cache unread count separately to allow targeted invalidation
  const unreadCount = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: fetchUnreadCount,
    staleTime: staleTime,
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: enableBackgroundFetching,
  });

  return {
    notifications: notifications.data || [],
    isLoading: notifications.isLoading,
    unreadCount: unreadCount.data || 0,
    refetch: notifications.refetch,
    isRefetching: notifications.isRefetching,
    isPaused: notifications.isPaused,
    isFetching: notifications.isFetching
  };
}
