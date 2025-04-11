
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AnalysisActionsProps {
  isAnalyzing: boolean;
  hasTranscriptionText: boolean;
  onAnalyzeContent: () => void;
  showSegmentGeneration?: boolean;
  canGenerateSegments?: boolean;
  onGenerateSegments?: () => void;
}

const AnalysisActions = ({
  isAnalyzing,
  hasTranscriptionText,
  onAnalyzeContent,
  showSegmentGeneration = false,
  canGenerateSegments = false,
  onGenerateSegments
}: AnalysisActionsProps) => {
  return (
    <div className="flex justify-between">
      <Button 
        className="bg-black text-white hover:bg-black/90"
        variant="default"
        onClick={onAnalyzeContent}
        disabled={isAnalyzing || !hasTranscriptionText}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analizando...
          </>
        ) : (
          'Analizar Contenido'
        )}
      </Button>
      
      {showSegmentGeneration && onGenerateSegments && (
        <Button
          variant="default"
          className="bg-black text-white hover:bg-black/90"
          onClick={onGenerateSegments}
          disabled={isAnalyzing || !canGenerateSegments}
        >
          Generar Segmentos con Timestamping
        </Button>
      )}
    </div>
  );
};

export default AnalysisActions;
