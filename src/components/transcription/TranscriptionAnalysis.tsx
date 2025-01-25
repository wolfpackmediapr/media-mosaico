import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [isExpanded, setIsExpanded] = useState(true);

  if (!analysis) return null;

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${section} copiado al portapapeles`);
  };

  return (
    <Card className="mt-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Análisis de Contenido</CardTitle>
          <CollapsibleTrigger className="rounded-full p-2 hover:bg-accent">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent className="space-y-4">
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analysis.quien && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">¿Quién?</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysis.quien!, "¿Quién?")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.quien}</p>
                </div>
              )}
              {analysis.que && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">¿Qué?</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysis.que!, "¿Qué?")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.que}</p>
                </div>
              )}
              {analysis.cuando && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">¿Cuándo?</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysis.cuando!, "¿Cuándo?")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.cuando}</p>
                </div>
              )}
              {analysis.donde && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">¿Dónde?</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysis.donde!, "¿Dónde?")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.donde}</p>
                </div>
              )}
              {analysis.porque && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">¿Por qué?</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(analysis.porque!, "¿Por qué?")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis.porque}</p>
                </div>
              )}
            </div>

            {analysis.summary && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Resumen</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(analysis.summary!, "Resumen")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </div>
            )}

            {analysis.alerts && analysis.alerts.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Alertas
                </h3>
                <div className="space-y-2">
                  {analysis.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.keywords && analysis.keywords.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Palabras Clave
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TranscriptionAnalysis;