
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, AlertTriangle, Eye, Users, Calendar, MapPin, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/services/toastService";
import { NewsSegment } from "@/hooks/use-video-processor";
import { TranscriptionResult } from "@/services/audio/transcriptionService";

interface TvAnalysisProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  onSegmentsGenerated?: (segments: NewsSegment[]) => void;
  onClearAnalysis?: (clearFn: () => void) => void;
  forceReset?: boolean;
}

const TvAnalysis = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  onSegmentsGenerated,
  onClearAnalysis,
  forceReset = false
}: TvAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [segments, setSegments] = useState<NewsSegment[]>([]);

  // Register clear function with parent
  React.useEffect(() => {
    if (onClearAnalysis) {
      onClearAnalysis(() => {
        console.log('[TvAnalysis] Clearing analysis and segments');
        setAnalysis(null);
        setSegments([]);
      });
    }
  }, [onClearAnalysis]);

  // Handle force reset
  React.useEffect(() => {
    if (forceReset) {
      console.log('[TvAnalysis] Force reset triggered');
      setAnalysis(null);
      setSegments([]);
    }
  }, [forceReset]);

  const handleAnalyzeContent = async () => {
    if (!transcriptionText?.trim()) {
      toast.error("No hay texto de transcripción para analizar");
      return;
    }

    setIsAnalyzing(true);
    console.log('[TvAnalysis] Starting content analysis for TV');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Call the analyze-radio-content function for TV content analysis
      const { data, error } = await supabase.functions.invoke('analyze-radio-content', {
        body: { 
          transcriptionText,
          transcriptionId,
          contentType: 'tv'
        }
      });

      if (error) {
        console.error('[TvAnalysis] Analysis error:', error);
        throw error;
      }

      if (data) {
        console.log('[TvAnalysis] Analysis completed:', data);
        setAnalysis(data.analysis);
        
        if (data.segments && Array.isArray(data.segments)) {
          console.log('[TvAnalysis] Segments received:', data.segments);
          
          // Save segments to TV-specific table
          if (transcriptionId && data.segments.length > 0) {
            console.log('[TvAnalysis] Saving segments to tv_news_segments table');
            const segmentsToInsert = data.segments.map((segment: any, index: number) => ({
              transcription_id: transcriptionId,
              segment_number: index + 1,
              segment_title: segment.headline || `Segmento ${index + 1}`,
              transcript: segment.text || '',
              timestamp_start: segment.start ? `${Math.floor(segment.start / 60)}:${String(segment.start % 60).padStart(2, '0')}` : null,
              timestamp_end: segment.end ? `${Math.floor(segment.end / 60)}:${String(segment.end % 60).padStart(2, '0')}` : null,
              start_ms: segment.start ? segment.start * 1000 : null,
              end_ms: segment.end ? segment.end * 1000 : null,
              keywords: segment.keywords || []
            }));
            
            const { error: insertError } = await supabase
              .from('tv_news_segments')
              .insert(segmentsToInsert);
              
            if (insertError) {
              console.error('[TvAnalysis] Error saving segments:', insertError);
            } else {
              console.log('[TvAnalysis] Segments saved successfully to tv_news_segments');
            }
          }
          
          setSegments(data.segments);
          if (onSegmentsGenerated) {
            onSegmentsGenerated(data.segments);
          }
        }

        toast.success("Análisis completado", {
          description: `Se han identificado ${data.segments?.length || 0} segmentos de noticias.`
        });
      }
    } catch (error: any) {
      console.error('[TvAnalysis] Error analyzing content:', error);
      toast.error("Error en el análisis", {
        description: error.message || "No se pudo analizar el contenido"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!transcriptionText) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Analysis Button */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Contenido TV</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleAnalyzeContent}
            disabled={isAnalyzing || !transcriptionText?.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando contenido...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Analizar contenido
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* 5W Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Análisis 5W (TV)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">¿Quién?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.quien || "No identificado"}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">¿Qué?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.que || "No identificado"}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">¿Cuándo?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.cuando || "No identificado"}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">¿Dónde?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.donde || "No identificado"}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">¿Por qué?</span>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.porque || "No identificado"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {analysis.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Resumen Ejecutivo (TV)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {analysis.alerts && analysis.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Alertas y Menciones (TV)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysis.alerts.map((alert: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-orange-800 dark:text-orange-200">{alert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Keywords */}
          {analysis.keywords && analysis.keywords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Palabras Clave (TV)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((keyword: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default TvAnalysis;
