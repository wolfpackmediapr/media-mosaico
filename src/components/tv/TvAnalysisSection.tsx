import React, { useEffect } from "react";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, Users, Calendar, MapPin, HelpCircle } from "lucide-react";

interface TvAnalysisProps {
  testAnalysis?: {
    quien: string;
    que: string;
    cuando: string;
    donde: string;
    porque: string;
    summary: string;
    alerts: string[];
    keywords: string[];
  };
  lastAction?: string | null;
}

interface TvAnalysisSectionProps {
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  testAnalysis?: TvAnalysisProps['testAnalysis'];
  onClearAnalysis?: (clearFn: () => void) => void;
  lastAction?: string | null;
}

const TvAnalysisSection = ({
  transcriptionText,
  transcriptionId,
  transcriptionResult,
  testAnalysis,
  onClearAnalysis,
  lastAction
}: TvAnalysisSectionProps) => {
  // Force clear when lastAction is 'clear'
  useEffect(() => {
    if (lastAction === 'clear') {
      console.log('[TvAnalysisSection] Detected clear action, ensuring analysis is reset');
    }
  }, [lastAction]);

  // Don't show analysis if no transcription text or if cleared
  if (!transcriptionText || lastAction === 'clear') {
    return null;
  }

  // Use test analysis if provided, otherwise show placeholder
  const analysis = testAnalysis || {
    quien: "Análisis en progreso...",
    que: "Procesando contenido de TV...",
    cuando: "Determinando tiempo...",
    donde: "Identificando ubicación...",
    porque: "Analizando contexto...",
    summary: "El análisis del contenido de TV se está procesando...",
    alerts: [],
    keywords: []
  };

  return (
    <div className="space-y-6">
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
              <p className="text-sm text-muted-foreground">{analysis.quien}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">¿Qué?</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.que}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">¿Cuándo?</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.cuando}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">¿Dónde?</span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.donde}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">¿Por qué?</span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.porque}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Ejecutivo (TV)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

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
              {analysis.alerts.map((alert, index) => (
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
              {analysis.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TvAnalysisSection;