
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress"; 

interface ClearAllButtonProps {
  onClearAll: () => Promise<void>;
  isClearing?: boolean;
  progress?: number;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({ 
  onClearAll,
  isClearing = false,
  progress = 0
}) => {
  const [open, setOpen] = React.useState(false);
  const [localIsClearing, setLocalIsClearing] = React.useState(false);
  const isClearingActive = isClearing || localIsClearing;
  
  // Use debounced state to prevent flickering in the UI
  React.useEffect(() => {
    if (isClearing) {
      setLocalIsClearing(true);
    } else {
      // Delay resetting local state to prevent UI jumping
      const timeout = setTimeout(() => {
        setLocalIsClearing(false);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [isClearing]);

  const handleConfirm = async () => {
    if (isClearingActive) return; // Prevent double-clicks
    
    try {
      setLocalIsClearing(true);
      console.log("[ClearAllButton] Starting clear all operation");
      
      // Close dialog first for better UX
      setOpen(false);
      
      // Use small timeout to allow dialog to close before potentially heavy operation
      setTimeout(async () => {
        try {
          await onClearAll();
          console.log("[ClearAllButton] Clear all completed successfully");
          // Success toast is now shown by the parent component
        } catch (error) {
          console.error("[ClearAllButton] Error clearing state:", error);
          toast.error("No se pudieron borrar todos los elementos");
        }
      }, 50);
    } catch (error) {
      console.error("[ClearAllButton] Error in clear operation:", error);
      toast.error("No se pudieron borrar todos los elementos");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent opening if already clearing
      if (isClearingActive && newOpen) return;
      setOpen(newOpen);
      // Reset state when dialog closes
      if (!newOpen && localIsClearing) {
        setTimeout(() => setLocalIsClearing(false), 500);
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          size="sm"
          disabled={isClearingActive}
        >
          <Trash className="w-4 h-4" />
          {isClearingActive ? "Borrando..." : "Borrar todo"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Borrar todo?</DialogTitle>
        </DialogHeader>
        <div>
          Esto eliminará todos los archivos y borrará todo el texto de transcripción. ¿Estás seguro? Esta acción no se puede deshacer.
        </div>
        {isClearingActive && (
          <div className="space-y-2">
            <div className="text-sm text-neutral-500">Borrando datos...</div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={() => setOpen(false)}
            disabled={isClearingActive}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isClearingActive}
          >
            {isClearingActive ? "Borrando..." : "Borrar todo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearAllButton;
