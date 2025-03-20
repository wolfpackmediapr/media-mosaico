
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { NotificationItemProps } from "@/components/notifications/NotificationItem";
import { useEffect, useCallback } from "react";

type NotificationAlert = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: "unread" | "read" | "archived";
  importance_level: number;
  content_id: string | null;
  content_type: string | null;
  keyword_matched: string[] | null;
  client_id: string | null;
  clients?: { name: string } | null;
  metadata: any | null;
};

export function useNotifications(options: { enableRealtime?: boolean } = {}) {
  const { enableRealtime = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transformNotification = (notification: any): Omit<NotificationItemProps, "onClick"> => {
    return {
      id: notification.id,
      title: notification.title,
      description: notification.description,
      createdAt: notification.created_at,
      status: notification.status || "unread",
      importance: notification.importance_level || 
        (notification.priority === "urgent" ? 5 : 
         notification.priority === "high" ? 4 : 
         notification.priority === "medium" ? 3 : 2),
      clientId: notification.client_id || null,
      clientName: notification.clients?.name || null,
      keywords: notification.keyword_matched || []
    };
  };

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

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("client_alerts")
      .update({ status: "read" })
      .eq("id", id);

    if (error) throw error;
    return id;
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("client_alerts")
      .update({ status: "read" })
      .eq("status", "unread");

    if (error) throw error;
    return true;
  };

  const markAsArchived = async (id: string) => {
    const { error } = await supabase
      .from("client_alerts")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) throw error;
    return id;
  };

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const unreadCount = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: fetchUnreadCount,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo marcar la notificación como leída",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
      toast({
        title: "Éxito",
        description: "Todas las notificaciones han sido marcadas como leídas",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron marcar todas las notificaciones como leídas",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const markAsArchivedMutation = useMutation({
    mutationFn: markAsArchived,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo archivar la notificación",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio("/notification-sound.mp3");
      audio.play().catch((e) => console.log("Could not play notification sound", e));
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification(title, { body });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error showing browser notification:", error);
    }
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_alerts"
        },
        (payload) => {
          console.log("New notification received:", payload);
          
          // Play sound
          playNotificationSound();
          
          // Show browser notification
          const newAlert = payload.new as NotificationAlert;
          showBrowserNotification(
            newAlert.title,
            newAlert.description || "Nueva notificación recibida"
          );
          
          // Refresh notifications data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "client_alerts"
        },
        () => {
          // Refresh notifications data
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, queryClient, playNotificationSound, showBrowserNotification]);

  return {
    notifications: notifications.data || [],
    isLoading: notifications.isLoading,
    unreadCount: unreadCount.data || 0,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAsArchived: markAsArchivedMutation.mutate,
    refetch: notifications.refetch,
  };
}
