
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash } from "lucide-react";

interface ClearAllButtonProps {
  onClearAll: () => void;
  disabled?: boolean;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({ onClearAll, disabled }) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onClearAll();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          size="sm"
          disabled={disabled}
        >
          <Trash className="w-4 h-4" />
          Borrar todo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Borrar todo?</DialogTitle>
        </DialogHeader>
        <div>
          Esto eliminará todos los archivos y borrará todo el texto de transcripción. ¿Estás seguro? Esta acción no se puede deshacer.
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Borrar todo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearAllButton;
