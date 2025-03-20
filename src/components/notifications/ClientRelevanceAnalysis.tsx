
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart, ArrowUpRight, ArrowDownRight, Tag, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientRelevanceAnalysisProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

interface Suggestion {
  type: string;
  title: string;
  description: string;
  items?: any[];
  current_engagement?: number;
  recommended_threshold?: number;
}

const ClientRelevanceAnalysis = ({
  clientId,
  clientName,
  onClose,
}: ClientRelevanceAnalysisProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [analysis, setAnalysis] = React.useState<{
    client_id: string;
    client_name: string;
    analyzed_count: number;
    overall_engagement: number;
    suggestions: Suggestion[];
  } | null>(null);

  const fetchAnalysis = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze_notification_relevance",
        {
          body: { client_id: clientId },
        }
      );

      if (error) throw error;
      setAnalysis(data);
    } catch (error) {
      console.error("Error analyzing notification relevance:", error);
      toast({
        title: "Error",
        description: "No se pudo analizar la relevancia de las notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [clientId, toast]);

  React.useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Relevancia</CardTitle>
          <CardDescription>
            Analizando notificaciones para {clientName}...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">
            Esto puede tomar unos momentos...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || analysis.analyzed_count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Relevancia</CardTitle>
          <CardDescription>
            No hay suficientes datos para {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2 text-center">
            No hay suficientes notificaciones para analizar la relevancia.
          </p>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Se necesitan al menos 10 notificaciones para generar recomendaciones.
          </p>
          <Button onClick={onClose}>Cerrar</Button>
        </CardContent>
      </Card>
    );
  }

  const engagementRate = analysis.overall_engagement * 100;
  const getEngagementColor = () => {
    if (engagementRate >= 70) return "text-green-500";
    if (engagementRate >= 40) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Relevancia</CardTitle>
        <CardDescription>
          Análisis basado en {analysis.analyzed_count} notificaciones para {analysis.client_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Card className="flex-1">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Tasa de engagement</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center">
                <span className={`text-3xl font-bold ${getEngagementColor()}`}>
                  {engagementRate.toFixed(1)}%
                </span>
                {engagementRate >= 60 ? (
                  <ArrowUpRight className="ml-2 h-5 w-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="ml-2 h-5 w-5 text-red-500" />
                )}
              </div>
              <Progress
                value={engagementRate}
                className="h-2 mt-2"
              />
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Notificaciones analizadas</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <span className="text-3xl font-bold">{analysis.analyzed_count}</span>
              <p className="text-sm text-muted-foreground mt-1">
                Notificaciones de los últimos 30 días
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="keywords">
          <TabsList className="mb-4">
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="contentTypes">Tipos de Contenido</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          </TabsList>
          
          <TabsContent value="keywords" className="space-y-4">
            {analysis.suggestions.find(s => s.type === "keyword_enhancement") && (
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <ArrowUpRight className="mr-2 h-4 w-4 text-green-500" />
                  Keywords con alta interacción
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestions
                    .find(s => s.type === "keyword_enhancement")
                    ?.items.map((item, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
                        {item.keyword}
                        <span className="ml-1 text-xs opacity-70">
                          {(item.engagementRate * 100).toFixed(0)}%
                        </span>
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            
            {analysis.suggestions.find(s => s.type === "keyword_refinement") && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <ArrowDownRight className="mr-2 h-4 w-4 text-red-500" />
                  Keywords con baja interacción
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestions
                    .find(s => s.type === "keyword_refinement")
                    ?.items.map((item, i) => (
                      <Badge key={i} variant="outline" className="bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
                        {item.keyword}
                        <span className="ml-1 text-xs opacity-70">
                          {(item.engagementRate * 100).toFixed(0)}%
                        </span>
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="contentTypes">
            {analysis.suggestions.find(s => s.type === "content_type_preference") && (
              <div>
                <h3 className="text-sm font-medium mb-3">Preferencia por tipo de contenido</h3>
                <div className="space-y-3">
                  {analysis.suggestions
                    .find(s => s.type === "content_type_preference")
                    ?.items.map((item, i) => {
                      const engagementPercent = item.engagementRate * 100;
                      let typeLabel = "";
                      switch (item.type) {
                        case "news": typeLabel = "Noticias"; break;
                        case "social": typeLabel = "Redes Sociales"; break;
                        case "radio": typeLabel = "Radio"; break;
                        case "tv": typeLabel = "TV"; break;
                        case "press": typeLabel = "Prensa"; break;
                        default: typeLabel = item.type;
                      }
                      
                      return (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">{typeLabel}</span>
                            <span className={`text-sm font-medium ${
                              engagementPercent >= 70 ? "text-green-500" :
                              engagementPercent >= 40 ? "text-amber-500" :
                              "text-red-500"
                            }`}>
                              {engagementPercent.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={engagementPercent} className="h-2" />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            {analysis.suggestions
              .filter(s => s.type.includes("threshold"))
              .map((suggestion, i) => (
                <Card key={i} className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{suggestion.title}</CardTitle>
                    <CardDescription>{suggestion.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center mt-2">
                      <Tag className="h-4 w-4 mr-2 text-amber-500" />
                      <span className="text-sm">
                        Umbral recomendado: <strong>{suggestion.recommended_threshold}</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
            <Button className="w-full" onClick={onClose}>
              Cerrar análisis
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClientRelevanceAnalysis;
