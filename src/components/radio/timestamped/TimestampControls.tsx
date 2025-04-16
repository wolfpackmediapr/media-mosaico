
import { Button } from "@/components/ui/button";
import { Download, Clock, SplitSquareHorizontal, Users, Type } from "lucide-react";

interface TimestampControlsProps {
  viewMode: 'speaker' | 'sentence' | 'word';
  canToggleViewMode: boolean;
  onToggleViewMode: () => void;
  onDownloadSRT: () => void;
  viewModeName?: string;
  nextViewModeName?: string;
}

const TimestampControls = ({
  viewMode,
  canToggleViewMode,
  onToggleViewMode,
  onDownloadSRT,
  viewModeName,
  nextViewModeName
}: TimestampControlsProps) => {
  // Function to get the icon based on view mode
  const getViewModeIcon = () => {
    switch(viewMode) {
      case 'speaker': 
        return <Users className="h-3 w-3 mr-1" />;
      case 'sentence':
        return <SplitSquareHorizontal className="h-3 w-3 mr-1" />;
      case 'word':
        return <Type className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  // Function to get the next icon
  const getNextViewModeIcon = () => {
    switch(viewMode) {
      case 'speaker': 
        return <SplitSquareHorizontal className="h-3 w-3 mr-1" />;
      case 'sentence':
        return <Type className="h-3 w-3 mr-1" />;
      case 'word':
        return <Users className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <div className="p-2 bg-muted/20 flex justify-between items-center border-b">
      <div className="flex gap-2 items-center">
        <div className="flex items-center bg-primary/10 px-2 py-1 rounded-md">
          {getViewModeIcon()}
          <span className="text-sm font-medium text-primary">
            {viewModeName || (viewMode === 'speaker' ? 'Vista por Hablantes' : 
                              viewMode === 'sentence' ? 'Vista por Oraciones' : 
                              'Vista por Palabras')}
          </span>
        </div>
        {canToggleViewMode && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleViewMode}
            className="h-7 text-xs hover:bg-primary hover:text-white transition-colors"
          >
            {getNextViewModeIcon()}
            {nextViewModeName || (viewMode === 'speaker' ? 'Cambiar a Oraciones' : 
                                  viewMode === 'sentence' ? 'Cambiar a Palabras' : 
                                  'Cambiar a Hablantes')}
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
