
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
    analysisType,
    analyzeContent: performAnalysis,
    hasTranscriptionText,
    hasVideoPath,
    canDoHybridAnalysis,
    canDoGeminiAnalysis,
    optimalAnalysisType
  } = useTvAnalysis({
    transcriptionText,
    transcriptionId,
    videoPath,
    onClearAnalysis,
    forceReset
  });

  const analyzeContent = async (requestedType?: 'text' | 'video' | 'hybrid' | 'gemini') => {
    const result = await performAnalysis(requestedType);
    
    if (result?.analysis) {
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
        typeof result.analysis === 'object' 
          ? JSON.stringify(result.analysis) 
          : result.analysis
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

  const getAnalysisTypeLabel = () => {
    switch (analysisType) {
      case 'gemini':
        return 'Gemini AI';
      case 'hybrid':
        return 'Híbrido';
      case 'video':
        return 'Video';
      case 'text':
        return 'Texto';
      default:
        return 'Análisis';
    }
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Análisis de Contenido TV
          {analysisType && (
            <span className="text-sm font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {getAnalysisTypeLabel()}
            </span>
          )}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Análisis inteligente potenciado por Gemini AI - Procesamiento multimodal avanzado de video y audio
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <TvAnalysisActions
          isAnalyzing={isAnalyzing}
          hasTranscriptionText={hasTranscriptionText}
          hasVideoPath={hasVideoPath}
          canDoHybridAnalysis={canDoHybridAnalysis}
          canDoGeminiAnalysis={canDoGeminiAnalysis}
          optimalAnalysisType={optimalAnalysisType}
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
