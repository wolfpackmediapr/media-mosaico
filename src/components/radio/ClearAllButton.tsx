
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash } from "lucide-react";
import { toast } from "sonner";

interface ClearAllButtonProps {
  onClearAll: () => void;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({ onClearAll }) => {
  const [open, setOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsClearing(true);
      await onClearAll();
      setOpen(false);
      toast.success("Se han borrado todos los archivos y transcripciones");
    } catch (error) {
      console.error("Error clearing state:", error);
      toast.error("No se pudieron borrar todos los elementos");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          size="sm"
          disabled={isClearing}
        >
          <Trash className="w-4 h-4" />
          {isClearing ? "Borrando..." : "Borrar todo"}
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
          <Button 
            variant="secondary" 
            onClick={() => setOpen(false)}
            disabled={isClearing}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isClearing}
          >
            {isClearing ? "Borrando..." : "Borrar todo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearAllButton;
