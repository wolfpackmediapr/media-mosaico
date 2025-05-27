
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
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  // Determine if showing progress
  const showProgress = isProcessing && clearingProgress > 0;
  const isClearing = clearingProgress > 0 && clearingProgress < 100;

  const handleConfirm = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      console.log("[ClearAllButton] Starting clear all operation");
      
      const success = await onClearAll();
      
      if (success) {
        toast.success("Se han borrado todos los archivos y transcripciones");
        console.log("[ClearAllButton] Clear all completed successfully");
      } else {
        console.warn("[ClearAllButton] Clear all completed with errors");
        toast.warning("La limpieza se completó pero algunos elementos podrían no haberse borrado completamente");
      }
      
    } catch (error) {
      console.error("[ClearAllButton] Error clearing state:", error);
      toast.error("Error durante la limpieza. Por favor, intente de nuevo.");
    } finally {
      // Only close dialog if not actively clearing
      if (!isClearing) {
        setIsProcessing(false);
        setOpen(false);
      }
    }
  };

  // Auto-close dialog when clearing completes successfully
  React.useEffect(() => {
    if (isProcessing && clearingProgress === 100) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
        setOpen(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isProcessing, clearingProgress]);

  const canClose = !isProcessing || (!isClearing && clearingProgress === 0);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!canClose && newOpen === false) return;
      setOpen(newOpen);
      if (!newOpen) {
        setIsProcessing(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          size="sm"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash className="w-4 h-4" />
          )}
          {isProcessing ? "Limpiando..." : "Borrar todo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isProcessing ? "Limpiando datos..." : "¿Borrar todo?"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isProcessing ? (
            <p className="text-sm text-muted-foreground">
              Esto eliminará todos los archivos y borrará todo el texto de transcripción. ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Limpiando todos los datos del sistema...
              </p>
              
              {showProgress && (
                <div className="space-y-2">
                  <Progress value={clearingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {clearingStage || "Procesando..."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="secondary" 
            onClick={() => setOpen(false)}
            disabled={!canClose}
            size="sm"
          >
            {isProcessing ? "Cancelar" : "Cancelar"}
          </Button>
          
          {!isProcessing && (
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              size="sm"
            >
              Borrar todo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClearAllButton;
