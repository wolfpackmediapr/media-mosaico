
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaMonitoring } from "@/hooks/monitoring/useMediaMonitoring";
import { Play, AlertCircle, Loader2 } from "lucide-react";
import SourceDistributionChart from "@/components/notifications/charts/SourceDistributionChart";
import NotificationVolumeChart from "@/components/notifications/charts/NotificationVolumeChart";
import KeywordsFrequencyChart from "@/components/notifications/charts/KeywordsFrequencyChart";

export function MediaMonitoringDashboard() {
  const { 
    monitoringSummary, 
    isLoadingSummary, 
    runScan, 
    isRunningMonitoring 
  } = useMediaMonitoring();
  
  // Format summary data for charts
  const sourceDistribution = monitoringSummary?.mentionsBySource 
    ? Object.entries(monitoringSummary.mentionsBySource).map(([source, count]) => ({
        source: source === "news" ? "Noticias" : 
                source === "social" ? "Redes Sociales" : 
                source === "radio" ? "Radio" : 
                source === "tv" ? "Televisión" : 
                source === "press" ? "Prensa Escrita" : source,
        count
      }))
    : [];
    
  const volumeData = monitoringSummary?.mentionsByDay || [];
  const keywordData = monitoringSummary?.topKeywords || [];

  const handleRunMonitoring = async () => {
    try {
      await runScan();
    } catch (error) {
      console.error("Error running monitoring scan:", error);
    }
  };

  if (isLoadingSummary) {
    return (
      <Card className="w-full min-h-[300px] flex items-center justify-center">
        <CardContent>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <div className="mt-2 text-muted-foreground">Cargando datos de monitoreo...</div>
        </CardContent>
      </Card>
    );
  }
  
  // No data state
  if (!monitoringSummary || monitoringSummary.totalMentions === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tablero de Monitoreo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No hay datos de monitoreo disponibles. Ejecute un escaneo para recopilar información.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleRunMonitoring} 
            disabled={isRunningMonitoring}
            className="w-full sm:w-auto"
          >
            {isRunningMonitoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando monitoreo...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Ejecutar monitoreo
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tablero de Monitoreo</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            {monitoringSummary.totalMentions} menciones totales
          </Badge>
          <Button 
            onClick={handleRunMonitoring} 
            disabled={isRunningMonitoring}
            size="sm"
          >
            {isRunningMonitoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Ejecutar monitoreo
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[300px]">
            <h3 className="text-lg font-medium mb-4">Distribución por Fuente</h3>
            <SourceDistributionChart data={sourceDistribution} />
          </div>
          <div className="h-[300px]">
            <h3 className="text-lg font-medium mb-4">Volumen por Día</h3>
            <NotificationVolumeChart data={volumeData} />
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Palabras Clave Principales</h3>
          <KeywordsFrequencyChart data={keywordData} />
        </div>
      </CardContent>
    </Card>
  );
}
