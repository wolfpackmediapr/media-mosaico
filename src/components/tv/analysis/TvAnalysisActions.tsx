
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Loader } from "lucide-react";

interface TvAnalysisActionsProps {
  isAnalyzing: boolean;
  hasContent: boolean;
  canAnalyze: boolean;
  onAnalyzeContent: () => void;
  showAnalyzeButton?: boolean; // NEW: Optional prop to hide analyze button
  showSegmentGeneration?: boolean;
  canGenerateSegments?: boolean;
  onGenerateSegments?: () => void;
  isGeneratingSegments?: boolean;
}

const TvAnalysisActions = ({
  isAnalyzing,
  hasContent,
  canAnalyze,
  onAnalyzeContent,
  showAnalyzeButton = true, // Default to true for backward compatibility
  showSegmentGeneration = false,
  canGenerateSegments = false,
  onGenerateSegments,
  isGeneratingSegments = false
}: TvAnalysisActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Show analyze button only if showAnalyzeButton is true */}
      {showAnalyzeButton && (
        <Button
          onClick={onAnalyzeContent}
          disabled={!canAnalyze || isAnalyzing}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4" />
              Analizar Contenido
            </>
          )}
        </Button>
      )}

      {/* Segment generation button */}
      {showSegmentGeneration && canGenerateSegments && onGenerateSegments && (
        <Button
          onClick={onGenerateSegments}
          disabled={isGeneratingSegments}
          variant="outline"
          className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          size="lg"
        >
          {isGeneratingSegments ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generar Segmentos
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default TvAnalysisActions;
