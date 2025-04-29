import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { NotificationPreference } from "@/components/settings/notifications/NotificationPreferenceTable";
import { NotificationPreferenceFormValues } from "@/components/settings/notifications/NotificationPreferenceForm";

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as NotificationPreference[];
    },
  });

  // Fetch clients for the form
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Create notification preference
  const createPreference = useMutation({
    mutationFn: async (values: NotificationPreferenceFormValues) => {
      // Ensure client_id is required
      if (!values.client_id) {
        throw new Error("Client ID is required");
      }
      
      const { data, error } = await supabase
        .from("notification_preferences")
        .insert({
          client_id: values.client_id,
          notification_channels: values.notification_channels,
          frequency: values.frequency,
          threshold: values.threshold,
          sources: values.sources,
          is_active: values.is_active
        })
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferencia creada", {
        description: "La preferencia de notificación ha sido creada exitosamente."
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: "No se pudo crear la preferencia de notificación."
      });
      console.error(error);
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .update({ is_active: isActive })
        .eq("id", id)
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (error) => {
      toast.error("Error", {
        description: "No se pudo actualizar la preferencia de notificación."
      });
      console.error(error);
    },
  });

  // Delete preference
  const deletePreference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_preferences")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferencia eliminada", {
        description: "La preferencia de notificación ha sido eliminada exitosamente."
      });
    },
    onError: (error) => {
      toast.error("Error", {
        description: "No se pudo eliminar la preferencia de notificación."
      });
      console.error(error);
    },
  });

  return {
    preferences: preferences || [],
    isLoading,
    clients,
    createPreference,
    toggleActive: (id: string, isActive: boolean) => toggleActive.mutate({ id, isActive }),
    deletePreference: (id: string) => deletePreference.mutate(id),
    isPending: createPreference.isPending
  };
}
