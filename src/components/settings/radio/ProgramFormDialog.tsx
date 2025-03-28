
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProgramFormProps } from "./ProgramForm/types";
import { ProgramForm } from "./ProgramForm";

interface ProgramFormDialogProps extends Omit<ProgramFormProps, 'onSubmit'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: ProgramFormProps['onSubmit'];
  title: string;
}

export function ProgramFormDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  program,
  stations
}: ProgramFormDialogProps) {
  console.log("ProgramFormDialog received stations:", stations);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
