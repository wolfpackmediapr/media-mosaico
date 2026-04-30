import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { NewsSegment } from "@/types/media";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTvSegmentGenerator } from "@/hooks/tv/useTvSegmentGenerator";
import { useTranscriptionPolling } from "@/hooks/tv/useTranscriptionPolling";
import TvAnalysisActions from "./analysis/TvAnalysisActions";
import TvAnalysisResult from "./analysis/TvAnalysisResult";
import { useTvAnalysisDisplay } from "@/hooks/tv/useTvAnalysisDisplay";
import { useTvNotifications } from "@/hooks/tv/useTvNotifications";
import { BaseAnalysisProps } from "@/components/shared/types/ComponentProps";
import { Loader2 } from "lucide-react";

interface TvAnalysisProps extends Omit<BaseAnalysisProps, 'onClearAnalysis'> {
  videoPath?: string;
  onClearAnalysis?: (clearFn: () => void) => void;
}

const TvAnalysis = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  videoPath,
  onSegmentsGenerated,
  onClearAnalysis,
  forceReset,
  analysisResults
}: TvAnalysisProps) => {
  const { generateTvSegments, isGenerating } = useTvSegmentGenerator(onSegmentsGenerated);
  const { createAnalysisNotification } = useTvNotifications();
  const { data: transcriptionStatus, isAnalysisPending } = useTranscriptionPolling(
    transcriptionId ?? null,
    !!transcriptionId
  );
  
  // Use new display hook to fetch existing analysis
  const {
    existingAnalysis,
    hasAnalysis: hasExistingAnalysis,
    isLoading: isLoadingExisting,
    refetchAnalysis
  } = useTvAnalysisDisplay({
    transcriptionId,
    forceRefresh: forceReset
  });

  // Determine which analysis to show (priority: analysisResults > existing > empty)
  const displayAnalysis = analysisResults || existingAnalysis;
  const hasAnalysisToShow = !!(analysisResults || hasExistingAnalysis);
  const hasTranscriptionReady = !!transcriptionText || !!transcriptionStatus?.transcription_text;
  const isWaitingForAnalysis = !!transcriptionId && !hasAnalysisToShow && (hasTranscriptionReady || isAnalysisPending || isLoadingExisting);

  // Clear function for parent
  const clearAnalysisState = () => {
    console.log('[TvAnalysis] Clearing analysis state');
    refetchAnalysis();
  };

  // Register clear function with parent
  React.useEffect(() => {
    if (typeof onClearAnalysis === "function") {
      onClearAnalysis(clearAnalysisState);
    }
  }, [onClearAnalysis]);

  const generateImprovedSegments = () => {
    if ((!transcriptionText && !transcriptionResult) || !onSegmentsGenerated) {
      toast.error("No hay contenido para generar segmentos");
      return;
    }

    if (transcriptionResult) {
      generateTvSegments(transcriptionResult);
    } else if (transcriptionText) {
      generateTvSegments(transcriptionText);
    }
    
    toast.success("Segmentos generados con timestamping mejorado");
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Análisis de Contenido TV
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {hasAnalysisToShow 
            ? "Análisis completado - Resultados disponibles"
            : isWaitingForAnalysis
              ? "Transcripción completada - Generando análisis"
              : "Análisis inteligente avanzado de contenido multimedia"
          }
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* Show analysis actions only if no analysis exists */}
        {!hasAnalysisToShow && (
          <div className="flex items-center justify-center gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            {isWaitingForAnalysis && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <p>
              {isWaitingForAnalysis
                ? "Generando análisis... Esto puede tardar 1–2 minutos."
                : "El análisis se mostrará automáticamente después del procesamiento del video."}
            </p>
          </div>
        )}
        
        {/* Show segment generation option always */}
        {(transcriptionText || transcriptionResult) && (
          <TvAnalysisActions
            isAnalyzing={false}
            hasContent={true}
            canAnalyze={false}
            onAnalyzeContent={() => {}}
            showAnalyzeButton={false} // Hide the analyze button
            showSegmentGeneration={true}
            canGenerateSegments={true}
            onGenerateSegments={generateImprovedSegments}
            isGeneratingSegments={isGenerating}
          />
        )}
        
        {/* Show analysis results */}
        {(hasAnalysisToShow || isLoadingExisting) && (
          <TvAnalysisResult 
            analysis={displayAnalysis} 
            isLoading={isLoadingExisting}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TvAnalysis;
