
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface TypeformControlsProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  onHide: () => void;
}

/**
 * Controls for the Typeform embed
 */
export const TypeformControls = ({ isRefreshing, onRefresh, onHide }: TypeformControlsProps) => {
  return (
    <div className="flex justify-end mb-2 gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Reiniciar formulario"
        title="Reiniciar formulario"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onHide}
      >
        Ocultar formulario
      </Button>
    </div>
  );
};

