
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaMonitoring } from "@/hooks/monitoring/useMediaMonitoring";
import { Play, AlertCircle, Loader2, BarChart3, BarChart4, PieChart } from "lucide-react";
import { SourceDistributionChart } from "@/components/notifications/charts";
import { NotificationVolumeChart } from "@/components/notifications/charts";
import { KeywordsFrequencyChart } from "@/components/notifications/charts";

export function MediaMonitoringDashboard() {
  const { 
    monitoringSummary, 
    isLoadingSummary, 
    runScan, 
    isRunningMonitoring,
    monitoringTargets
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
  const clientImpactData = monitoringSummary?.clientImpact || [];

  const handleRunMonitoring = async () => {
    try {
      await runScan();
    } catch (error) {
      console.error("Error al ejecutar escaneo de monitoreo:", error);
    }
  };

  if (isLoadingSummary) {
    return (
      <Card className="w-full min-h-[300px] flex items-center justify-center">
        <CardContent>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <div className="mt-2 text-center text-muted-foreground">Cargando datos de monitoreo...</div>
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
              No hay datos de monitoreo disponibles. {monitoringTargets.length === 0 ? 
                "Primero debe crear objetivos de monitoreo y luego ejecutar un escaneo." : 
                "Ejecute un escaneo para recopilar información."}
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleRunMonitoring} 
            disabled={isRunningMonitoring || monitoringTargets.length === 0}
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
          
          {monitoringTargets.length === 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Antes de poder ejecutar un monitoreo, debe crear objetivos en la pestaña "Objetivos".
            </div>
          )}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Palabras Clave Principales</h3>
            <KeywordsFrequencyChart data={keywordData} />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Impacto por Cliente</h3>
            {clientImpactData.length > 0 ? (
              <div className="space-y-2">
                {clientImpactData.map((client) => (
                  <div key={client.clientId} className="flex items-center justify-between">
                    <span className="text-sm">{client.clientName}</span>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ 
                            width: `${Math.min(100, (client.mentionCount / Math.max(...clientImpactData.map(c => c.mentionCount))) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline">{client.mentionCount}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No hay datos de impacto por cliente disponibles</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
