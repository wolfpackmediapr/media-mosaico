
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash } from "lucide-react";
import { toast } from "sonner";

interface ClearAllButtonProps {
  onClearAll: () => Promise<void>;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({ onClearAll }) => {
  const [open, setOpen] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);

  const handleConfirm = async () => {
    if (isClearing) return; // Prevent double-clicks
    
    try {
      setIsClearing(true);
      console.log("[ClearAllButton] Starting clear all operation");
      
      // Close dialog first for better UX
      setOpen(false);
      
      // Use small timeout to allow dialog to close before potentially heavy operation
      setTimeout(async () => {
        await onClearAll();
        console.log("[ClearAllButton] Clear all completed successfully");
        // Success toast is now shown by the parent component
      }, 50);
    } catch (error) {
      console.error("[ClearAllButton] Error clearing state:", error);
      toast.error("No se pudieron borrar todos los elementos");
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent opening if already clearing
      if (isClearing && newOpen) return;
      setOpen(newOpen);
      // Reset state when dialog closes
      if (!newOpen && isClearing) {
        setTimeout(() => setIsClearing(false), 500);
      }
    }}>
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
