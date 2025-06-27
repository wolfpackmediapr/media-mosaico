
import { Button } from "@/components/ui/button";
import { Loader2, Play, Settings, Video, FileText, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TvAnalysisActionsProps {
  isAnalyzing: boolean;
  hasTranscriptionText: boolean;
  hasVideoPath?: boolean;
  canDoHybridAnalysis?: boolean;
  optimalAnalysisType?: 'text' | 'video' | 'hybrid';
  onAnalyzeContent: (type?: 'text' | 'video' | 'hybrid') => void;
  showSegmentGeneration?: boolean;
  canGenerateSegments?: boolean;
  onGenerateSegments?: () => void;
  isGeneratingSegments?: boolean;
}

const TvAnalysisActions = ({
  isAnalyzing,
  hasTranscriptionText,
  hasVideoPath = false,
  canDoHybridAnalysis = false,
  optimalAnalysisType = 'text',
  onAnalyzeContent,
  showSegmentGeneration = false,
  canGenerateSegments = false,
  onGenerateSegments,
  isGeneratingSegments = false
}: TvAnalysisActionsProps) => {
  
  const getAnalysisTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Análisis de Texto';
      case 'video': return 'Análisis de Video';
      case 'hybrid': return 'Análisis Híbrido';
      default: return 'Análisis';
    }
  };

  const getAnalysisTypeDescription = (type: string) => {
    switch (type) {
      case 'text': return 'Analiza solo la transcripción de texto';
      case 'video': return 'Análisis visual completo del video';
      case 'hybrid': return 'Combina análisis de texto y video (recomendado)';
      default: return '';
    }
  };

  const hasAnyContent = hasTranscriptionText || hasVideoPath;

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex gap-2 flex-wrap">
        {/* Primary Analysis Button */}
        <Button
          onClick={() => onAnalyzeContent()}
          disabled={!hasAnyContent || isAnalyzing}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md"
        >
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isAnalyzing 
            ? "Analizando..." 
            : `${getAnalysisTypeLabel(optimalAnalysisType)} (Gemini AI)`
          }
        </Button>

        {/* Advanced Analysis Options */}
        {hasAnyContent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                disabled={isAnalyzing}
                className="border-blue-200 hover:border-blue-300"
              >
                <Settings className="mr-2 h-4 w-4" />
                Opciones Avanzadas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel className="font-semibold">
                Tipos de Análisis Disponibles
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {hasTranscriptionText && (
                <DropdownMenuItem 
                  onClick={() => onAnalyzeContent('text')}
                  disabled={isAnalyzing}
                  className="flex flex-col items-start py-3"
                >
                  <div className="flex items-center w-full">
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                    <span className="font-medium">Análisis de Texto</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 ml-6">
                    {getAnalysisTypeDescription('text')}
                  </span>
                </DropdownMenuItem>
              )}

              {hasVideoPath && (
                <DropdownMenuItem 
                  onClick={() => onAnalyzeContent('video')}
                  disabled={isAnalyzing}
                  className="flex flex-col items-start py-3"
                >
                  <div className="flex items-center w-full">
                    <Video className="mr-2 h-4 w-4 text-green-600" />
                    <span className="font-medium">Análisis de Video</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 ml-6">
                    {getAnalysisTypeDescription('video')}
                  </span>
                </DropdownMenuItem>
              )}

              {canDoHybridAnalysis && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onAnalyzeContent('hybrid')}
                    disabled={isAnalyzing}
                    className="flex flex-col items-start py-3 bg-gradient-to-r from-purple-50 to-blue-50"
                  >
                    <div className="flex items-center w-full">
                      <Zap className="mr-2 h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-700">Análisis Híbrido</span>
                      <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        Recomendado
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 ml-6">
                      {getAnalysisTypeDescription('hybrid')}
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Segment Generation Button */}
      {showSegmentGeneration && (
        <Button
          onClick={onGenerateSegments}
          disabled={!canGenerateSegments || isGeneratingSegments}
          variant="outline"
          className="border-green-200 hover:border-green-300 text-green-700 hover:text-green-800"
        >
          {isGeneratingSegments ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isGeneratingSegments ? "Generando..." : "Generar Segmentos"}
        </Button>
      )}

      {/* Status Indicators */}
      <div className="flex flex-col text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {hasTranscriptionText && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-blue-500" />
              Texto disponible
            </span>
          )}
          {hasVideoPath && (
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3 text-green-500" />
              Video disponible
            </span>
          )}
        </div>
        {optimalAnalysisType && (
          <span className="text-xs text-muted-foreground mt-1">
            Análisis óptimo: {getAnalysisTypeLabel(optimalAnalysisType)}
          </span>
        )}
      </div>
    </div>
  );
};

export default TvAnalysisActions;
