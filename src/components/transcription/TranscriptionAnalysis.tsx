import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Tag } from "lucide-react";

interface TranscriptionAnalysisProps {
  analysis?: {
    quien?: string;
    que?: string;
    cuando?: string;
    donde?: string;
    porque?: string;
    summary?: string;
    alerts?: any[];
    keywords?: string[];
  };
}

const TranscriptionAnalysis = ({ analysis }: TranscriptionAnalysisProps) => {
  if (!analysis) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Análisis de Contenido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {analysis.quien && (
            <div>
              <h3 className="font-semibold mb-2">¿Quién?</h3>
              <p className="text-sm text-muted-foreground">{analysis.quien}</p>
            </div>
          )}
          {analysis.que && (
            <div>
              <h3 className="font-semibold mb-2">¿Qué?</h3>
              <p className="text-sm text-muted-foreground">{analysis.que}</p>
            </div>
          )}
          {analysis.cuando && (
            <div>
              <h3 className="font-semibold mb-2">¿Cuándo?</h3>
              <p className="text-sm text-muted-foreground">{analysis.cuando}</p>
            </div>
          )}
          {analysis.donde && (
            <div>
              <h3 className="font-semibold mb-2">¿Dónde?</h3>
              <p className="text-sm text-muted-foreground">{analysis.donde}</p>
            </div>
          )}
          {analysis.porque && (
            <div>
              <h3 className="font-semibold mb-2">¿Por qué?</h3>
              <p className="text-sm text-muted-foreground">{analysis.porque}</p>
            </div>
          )}
        </div>

        {analysis.summary && (
          <div>
            <h3 className="font-semibold mb-2">Resumen</h3>
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>
        )}

        {analysis.alerts && analysis.alerts.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Alertas
            </h3>
            <div className="space-y-2">
              {analysis.alerts.map((alert, index) => (
                <div key={index} className="text-sm text-yellow-600 dark:text-yellow-500">
                  {alert}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.keywords && analysis.keywords.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Palabras Clave
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TranscriptionAnalysis;