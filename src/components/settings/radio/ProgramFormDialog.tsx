
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgramType, StationType } from "@/services/radio/types";
import { ProgramForm } from "./ProgramForm";

interface ProgramFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  title: string;
  program?: ProgramType;
  stations: StationType[];
}

export function ProgramFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  program,
  stations,
}: ProgramFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Completa los campos para {program ? "actualizar el" : "crear un nuevo"} programa de radio.
          </DialogDescription>
        </DialogHeader>
        <ProgramForm 
          program={program}
          stations={stations}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
