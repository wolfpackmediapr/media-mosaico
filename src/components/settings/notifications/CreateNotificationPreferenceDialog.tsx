
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import NotificationPreferenceForm, { NotificationPreferenceFormValues } from "./NotificationPreferenceForm";

interface CreateNotificationPreferenceDialogProps {
  onSubmit: (values: NotificationPreferenceFormValues) => void;
  clients?: { id: string; name: string }[];
  isPending: boolean;
}

const CreateNotificationPreferenceDialog = ({
  onSubmit,
  clients = [],
  isPending
}: CreateNotificationPreferenceDialogProps) => {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (values: NotificationPreferenceFormValues) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Preferencia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear nueva preferencia de notificación</DialogTitle>
          <DialogDescription>
            Configure cómo quiere recibir las notificaciones para este cliente.
          </DialogDescription>
        </DialogHeader>
        <NotificationPreferenceForm 
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={isPending}
          clients={clients}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateNotificationPreferenceDialog;
