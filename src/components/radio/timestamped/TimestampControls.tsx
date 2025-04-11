
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface TimestampControlsProps {
  viewMode: 'sentence' | 'word';
  canToggleViewMode: boolean;
  onToggleViewMode: () => void;
  onDownloadSRT: () => void;
}

const TimestampControls = ({
  viewMode,
  canToggleViewMode,
  onToggleViewMode,
  onDownloadSRT
}: TimestampControlsProps) => {
  return (
    <div className="p-2 bg-muted/20 flex justify-between items-center">
      <div className="flex gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {viewMode === 'sentence' ? 'Vista por Oraciones' : 'Vista por Palabras'}
        </span>
        {canToggleViewMode && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleViewMode}
            className="h-7 text-xs"
          >
            {viewMode === 'sentence' ? 'Cambiar a Palabras' : 'Cambiar a Oraciones'}
          </Button>
        )}
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onDownloadSRT}
        className="h-7"
        title="Descargar como subtítulos SRT"
      >
        <Download className="h-3 w-3 mr-1" /> SRT
      </Button>
    </div>
  );
};

export default TimestampControls;
