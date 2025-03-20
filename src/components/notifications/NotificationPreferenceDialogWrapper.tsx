
import React from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ClientNotificationPreferenceDialog from "./ClientNotificationPreferenceDialog";
import { NotificationPreferenceFormValues } from "@/components/settings/notifications/NotificationPreferenceForm";

interface NotificationPreferenceDialogWrapperProps {
  showPreferenceDialog: boolean;
  setShowPreferenceDialog: (value: boolean) => void;
  selectedClient: any;
}

const NotificationPreferenceDialogWrapper = ({
  showPreferenceDialog,
  setShowPreferenceDialog,
  selectedClient
}: NotificationPreferenceDialogWrapperProps) => {
  const { toast } = useToast();
  
  // Create notification preference mutation
  const createPreference = async (values: NotificationPreferenceFormValues) => {
    try {
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
      
      toast({
        title: "Preferencia creada",
        description: "La preferencia de notificación ha sido creada exitosamente."
      });
      
      setShowPreferenceDialog(false);
      
    } catch (error) {
      console.error("Error creating notification preference:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la preferencia de notificación.",
        variant: "destructive"
      });
    }
  };

  if (!selectedClient) return null;
  
  return (
    <ClientNotificationPreferenceDialog
      open={showPreferenceDialog}
      onOpenChange={setShowPreferenceDialog}
      clientId={selectedClient.id}
      clientName={selectedClient.name}
      onSubmit={createPreference}
    />
  );
};

export default NotificationPreferenceDialogWrapper;
