
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NotificationPreferenceForm, { NotificationPreferenceFormValues } from "@/components/settings/notifications/NotificationPreferenceForm";

interface ClientNotificationPreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSubmit: (values: NotificationPreferenceFormValues) => void;
  isPending?: boolean;
}

const ClientNotificationPreferenceDialog = ({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSubmit,
  isPending = false,
}: ClientNotificationPreferenceDialogProps) => {
  const handleSubmit = (values: NotificationPreferenceFormValues) => {
    // Ensure client_id is set
    onSubmit({
      ...values,
      client_id: clientId,
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preferencias de Notificación</DialogTitle>
          <DialogDescription>
            Configurar notificaciones para {clientName}
          </DialogDescription>
        </DialogHeader>
        
        <NotificationPreferenceForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isPending}
          presetClientId={clientId}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ClientNotificationPreferenceDialog;
