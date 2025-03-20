
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { NotificationItemProps } from "@/components/notifications/NotificationItem";

type NotificationAlert = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  created_at: string;
  status: "unread" | "read" | "archived";
  client_id: string | null;
  importance_level: number;
  content_id: string | null;
  content_type: string | null;
  keyword_matched: string[] | null;
  metadata: any | null;
};

export function useNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const transformNotification = (notification: NotificationAlert): Omit<NotificationItemProps, "onClick"> => {
    return {
      id: notification.id,
      title: notification.title,
      description: notification.description,
      createdAt: notification.created_at,
      status: notification.status,
      importance: notification.importance_level || 
        (notification.priority === "urgent" ? 5 : 
         notification.priority === "high" ? 4 : 
         notification.priority === "medium" ? 3 : 2)
    };
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("client_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data as NotificationAlert[]).map(transformNotification);
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
