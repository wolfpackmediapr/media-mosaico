
import React from "react";
import { Button } from "@/components/ui/button";
import { Brain, Zap } from "lucide-react";

interface TvAnalysisActionsProps {
  isAnalyzing: boolean;
  hasContent: boolean;
  canAnalyze: boolean;
  onAnalyzeContent: () => void;
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
  showSegmentGeneration = false,
  canGenerateSegments = false,
  onGenerateSegments,
  isGeneratingSegments = false,
}: TvAnalysisActionsProps) => {
  return (
    <div className="space-y-4">
      {/* Main Analysis Button */}
      <div className="space-y-2">
        <Button
          onClick={onAnalyzeContent}
          disabled={isAnalyzing || !canAnalyze}
          className="w-full"
          size="lg"
        >
          <Brain className="w-4 h-4 mr-2" />
          {isAnalyzing ? 'Analizando contenido...' : 'Analizar Contenido'}
        </Button>
        {hasContent && (
          <p className="text-sm text-muted-foreground text-center">
            Análisis inteligente de video y transcripción
          </p>
        )}
        {!hasContent && (
          <p className="text-sm text-muted-foreground text-center">
            Sube un video o añade texto para comenzar el análisis
          </p>
        )}
      </div>

      {/* Segment Generation */}
      {showSegmentGeneration && (
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            onClick={onGenerateSegments}
            disabled={!canGenerateSegments || isGeneratingSegments}
            className="w-full"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isGeneratingSegments ? 'Generando segmentos...' : 'Generar segmentos mejorados'}
          </Button>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Genera segmentos de noticias con timestamps precisos
          </p>
        </div>
      )}
    </div>
  );
};

export default TvAnalysisActions;
