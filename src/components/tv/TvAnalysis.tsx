
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { NewsSegment } from "@/hooks/tv/useTvVideoProcessor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { useTvSegmentGenerator } from "@/hooks/tv/useTvSegmentGenerator";
import TvAnalysisActions from "./analysis/TvAnalysisActions";
import TvAnalysisResult from "./analysis/TvAnalysisResult";
import { useTvAnalysis } from "@/hooks/tv/useTvAnalysis";
import { useTvNotifications } from "@/hooks/tv/useTvNotifications";

interface TvAnalysisProps {
  transcriptionText?: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  videoPath?: string;
  onSegmentsGenerated?: (segments: NewsSegment[]) => void;
  onClearAnalysis?: (clearFn: () => void) => void;
  forceReset?: boolean;
}

const TvAnalysis = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  videoPath,
  onSegmentsGenerated,
  onClearAnalysis,
  forceReset
}: TvAnalysisProps) => {
  const { generateTvSegments, isGenerating } = useTvSegmentGenerator(onSegmentsGenerated);
  const { createAnalysisNotification } = useTvNotifications();
  
  const {
    isAnalyzing,
    analysis,
    analyzeContent: performAnalysis,
    hasContent,
    canAnalyze
  } = useTvAnalysis({
    transcriptionText,
    transcriptionId,
    videoPath,
    onClearAnalysis,
    forceReset
  });

  const analyzeContent = async () => {
    const result = await performAnalysis();
    
    if (result?.success) {
      // Generate segments if callback provided
      if (onSegmentsGenerated) {
        if (transcriptionResult) {
          generateTvSegments(transcriptionResult);
        } else if (transcriptionText) {
          generateTvSegments(transcriptionText);
        }
      }
      
      // Create notification
      await createAnalysisNotification(
        result.summary || "Análisis de contenido completado"
      );
    }
  };

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
          Análisis inteligente avanzado de contenido multimedia
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <TvAnalysisActions
          isAnalyzing={isAnalyzing}
          hasContent={hasContent}
          canAnalyze={canAnalyze}
          onAnalyzeContent={analyzeContent}
          showSegmentGeneration={true}
          canGenerateSegments={!!(transcriptionText || transcriptionResult)}
          onGenerateSegments={generateImprovedSegments}
          isGeneratingSegments={isGenerating}
        />
        <TvAnalysisResult analysis={analysis} />
      </CardContent>
    </Card>
  );
};

export default TvAnalysis;
