import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Tag, Users, FileText, Bell } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    analysis_category?: string;
    analysis_content_summary?: string;
    analysis_client_relevance?: Record<string, string>;
    analysis_keywords?: string[];
    analysis_notifications?: Array<{
      client: string;
      importance: string;
      message: string;
    }>;
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
        <Accordion type="single" collapsible className="w-full">
          {/* 5W Analysis */}
          <AccordionItem value="5w">
            <AccordionTrigger>Análisis 5W</AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </AccordionItem>

          {/* Enhanced Analysis */}
          <AccordionItem value="enhanced">
            <AccordionTrigger>Análisis Detallado</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {/* Category */}
                {analysis.analysis_category && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Categoría
                    </h3>
                    <Badge variant="secondary" className="text-sm">
                      {analysis.analysis_category}
                    </Badge>
                  </div>
                )}

                {/* Content Summary */}
                {analysis.analysis_content_summary && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Resumen
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {analysis.analysis_content_summary}
                    </p>
                  </div>
                )}

                {/* Client Relevance */}
                {analysis.analysis_client_relevance && Object.keys(analysis.analysis_client_relevance).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Relevancia para Clientes
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(analysis.analysis_client_relevance).map(([client, relevance]) => (
                        <div key={client} className="border rounded-lg p-3">
                          <h4 className="font-medium text-sm">{client}</h4>
                          <p className="text-sm text-muted-foreground">{relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords */}
                {analysis.analysis_keywords && analysis.analysis_keywords.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Palabras Clave
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.analysis_keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {analysis.analysis_notifications && analysis.analysis_notifications.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificaciones
                    </h3>
                    <div className="space-y-2">
                      {analysis.analysis_notifications.map((notification, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-3 ${
                            notification.importance === 'alta'
                              ? 'border-red-200 bg-red-50 dark:bg-red-950'
                              : notification.importance === 'media'
                              ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'
                              : 'border-blue-200 bg-blue-50 dark:bg-blue-950'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm">{notification.client}</h4>
                            <Badge
                              variant={
                                notification.importance === 'alta'
                                  ? 'destructive'
                                  : notification.importance === 'media'
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {notification.importance}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default TranscriptionAnalysis;