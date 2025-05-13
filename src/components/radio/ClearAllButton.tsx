
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ClearAllButtonProps {
  onClearAll: () => Promise<boolean>;
  clearingProgress?: number;
  clearingStage?: string;
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({ 
  onClearAll,
  clearingProgress = 0,
  clearingStage = ''
}) => {
  const [open, setOpen] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  
  // Determine if showing progress
  const showProgress = isClearing && clearingProgress > 0;

  const handleConfirm = async () => {
    try {
      setIsClearing(true);
      console.log("[ClearAllButton] Starting clear all operation");
      
      // Always await the promise resolution, whether it resolves to true or false
      const success = await onClearAll();
      
      if (success) {
        toast.success("Se han borrado todos los archivos y transcripciones");
        console.log("[ClearAllButton] Clear all completed successfully");
      } else {
        console.warn("[ClearAllButton] Clear all completed but returned false");
        toast.warning("Algunos elementos no se pudieron borrar completamente");
      }
      
    } catch (error) {
      console.error("[ClearAllButton] Error clearing state:", error);
      toast.error("No se pudieron borrar todos los elementos");
    } finally {
      setIsClearing(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Don't allow closing the dialog while clearing is in progress
      if (isClearing && newOpen === false) return;
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          size="sm"
          disabled={isClearing}
        >
          {isClearing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash className="w-4 h-4" />
          )}
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
        
        {showProgress && (
          <div className="space-y-2">
            <Progress value={clearingProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">{clearingStage || "Limpiando..."}</p>
          </div>
        )}
        
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
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Borrando...
              </>
            ) : (
              "Borrar todo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearAllButton;
