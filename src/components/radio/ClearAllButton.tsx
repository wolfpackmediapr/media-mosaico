
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClearAllButtonProps {
  onClearAll: () => void;
  isClearing?: boolean; // Add prop to show clearing state
}

const ClearAllButton: React.FC<ClearAllButtonProps> = ({ 
  onClearAll,
  isClearing = false
}) => {
  const [open, setOpen] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  
  // Combine both loading states
  const isLoading = isClearing || isConfirming;

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onClearAll();
      setOpen(false);
      // Don't show success toast here, it will be shown in the onClearAll function
    } catch (error) {
      console.error("Error clearing state:", error);
      toast.error("No se pudieron borrar todos los elementos");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="flex items-center gap-2"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash className="w-4 h-4" />
          )}
          {isLoading ? "Borrando..." : "Borrar todo"}
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
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
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
