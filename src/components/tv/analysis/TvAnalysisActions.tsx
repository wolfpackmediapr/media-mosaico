
import React from "react";
import { Button } from "@/components/ui/button";
import { Brain, FileText, Video, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TvAnalysisActionsProps {
  isAnalyzing: boolean;
  hasTranscriptionText: boolean;
  hasVideoPath: boolean;
  canDoHybridAnalysis: boolean;
  canDoGeminiAnalysis?: boolean;
  optimalAnalysisType: 'text' | 'video' | 'hybrid' | 'gemini';
  onAnalyzeContent: (type?: 'text' | 'video' | 'hybrid' | 'gemini') => void;
  showSegmentGeneration?: boolean;
  canGenerateSegments?: boolean;
  onGenerateSegments?: () => void;
  isGeneratingSegments?: boolean;
}

const TvAnalysisActions = ({
  isAnalyzing,
  hasTranscriptionText,
  hasVideoPath,
  canDoHybridAnalysis,
  canDoGeminiAnalysis = false,
  optimalAnalysisType,
  onAnalyzeContent,
  showSegmentGeneration = false,
  canGenerateSegments = false,
  onGenerateSegments,
  isGeneratingSegments = false,
}: TvAnalysisActionsProps) => {
  const getAnalysisTypeInfo = (type: string) => {
    switch (type) {
      case 'gemini':
        return {
          label: 'Gemini AI',
          icon: Sparkles,
          description: 'Análisis multimodal completo con IA avanzada',
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      case 'hybrid':
        return {
          label: 'Híbrido',
          icon: Brain,
          description: 'Análisis combinado de texto y video',
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'video':
        return {
          label: 'Video',
          icon: Video,
          description: 'Análisis visual del contenido',
          color: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'text':
        return {
          label: 'Texto',
          icon: FileText,
          description: 'Análisis de transcripción',
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
      default:
        return {
          label: 'Análisis',
          icon: Brain,
          description: 'Análisis de contenido',
          color: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const optimalInfo = getAnalysisTypeInfo(optimalAnalysisType);
  const OptimalIcon = optimalInfo.icon;

  return (
    <div className="space-y-4">
      {/* Optimal Analysis Button */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onAnalyzeContent()}
            disabled={isAnalyzing}
            className="flex-1"
            size="lg"
          >
            <OptimalIcon className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analizando...' : `Analizar con ${optimalInfo.label}`}
          </Button>
          <Badge variant="outline" className={optimalInfo.color}>
            Recomendado
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {optimalInfo.description}
        </p>
      </div>

      {/* Alternative Analysis Options */}
      {(hasTranscriptionText || hasVideoPath) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Opciones alternativas:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {/* Gemini Analysis */}
            {canDoGeminiAnalysis && optimalAnalysisType !== 'gemini' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyzeContent('gemini')}
                disabled={isAnalyzing}
                className="justify-start"
              >
                <Sparkles className="w-3 h-3 mr-2" />
                Gemini AI
              </Button>
            )}

            {/* Hybrid Analysis */}
            {canDoHybridAnalysis && optimalAnalysisType !== 'hybrid' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyzeContent('hybrid')}
                disabled={isAnalyzing}
                className="justify-start"
              >
                <Brain className="w-3 h-3 mr-2" />
                Híbrido
              </Button>
            )}

            {/* Video Analysis */}
            {hasVideoPath && optimalAnalysisType !== 'video' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyzeContent('video')}
                disabled={isAnalyzing}
                className="justify-start"
              >
                <Video className="w-3 h-3 mr-2" />
                Solo Video
              </Button>
            )}

            {/* Text Analysis */}
            {hasTranscriptionText && optimalAnalysisType !== 'text' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyzeContent('text')}
                disabled={isAnalyzing}
                className="justify-start"
              >
                <FileText className="w-3 h-3 mr-2" />
                Solo Texto
              </Button>
            )}
          </div>
        </div>
      )}

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
          <p className="text-xs text-muted-foreground mt-1">
            Genera segmentos de noticias con timestamps precisos
          </p>
        </div>
      )}
    </div>
  );
};

export default TvAnalysisActions;
