
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook for notification action mutations (mark as read, archived, etc)
 */
export function useNotificationMutations() {
  const queryClient = useQueryClient();

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

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    },
    onError: (error) => {
      toast.error("Error", {
        description: "No se pudo marcar la notificación como leída"
      });
      console.error(error);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
      toast.success("Éxito", {
        description: "Todas las notificaciones han sido marcadas como leídas"
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: "No se pudieron marcar todas las notificaciones como leídas"
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
      toast.error("Error", {
        description: "No se pudo archivar la notificación"
      });
      console.error(error);
    },
  });

  return {
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    markAsArchived: markAsArchivedMutation.mutate,
  };
}
