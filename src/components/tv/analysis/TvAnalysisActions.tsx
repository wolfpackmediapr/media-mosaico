import { Button } from "@/components/ui/button";
import { Loader2, AlignCenter } from "lucide-react";

interface TvAnalysisActionsProps {
  isAnalyzing: boolean;
  hasTranscriptionText: boolean;
  onAnalyzeContent: () => void;
  showSegmentGeneration?: boolean;
  canGenerateSegments?: boolean;
  onGenerateSegments?: () => void;
  isGeneratingSegments?: boolean;
}

const TvAnalysisActions = ({
  isAnalyzing,
  hasTranscriptionText,
  onAnalyzeContent,
  showSegmentGeneration = false,
  canGenerateSegments = false,
  onGenerateSegments,
  isGeneratingSegments = false
}: TvAnalysisActionsProps) => {
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
      
      {showSegmentGeneration && (
        <Button
          variant="outline"
          onClick={onGenerateSegments}
          disabled={!canGenerateSegments || isGeneratingSegments}
        >
          {isGeneratingSegments ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <AlignCenter className="mr-2 h-4 w-4" />
              Generar Segmentos
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default TvAnalysisActions;