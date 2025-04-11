
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaMonitoringProcess } from "@/components/monitoring/MediaMonitoringProcess";
import { MediaMonitoringDashboard } from "@/components/monitoring/MediaMonitoringDashboard";
import { MonitoringTargetsManager } from "@/components/monitoring/MonitoringTargetsManager";
import ProcessingJobsTable from "@/components/monitoring/ProcessingJobsTable";
import DeliveryLogsTable from "@/components/monitoring/DeliveryLogsTable";
import { useNotificationProcessing } from "@/hooks/use-notification-processing";

export default function MediaMonitoring() {
  const [activeTab, setActiveTab] = useState("overview");
  
  const {
    jobs,
    jobsCount,
    isLoadingJobs,
    deliveryLogs,
    deliveryLogsCount,
    isLoadingDeliveryLogs,
    activeFilter,
    setActiveFilter,
    page,
    setPage,
    pageSize
  } = useNotificationProcessing();

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Monitoreo de Medios</h1>
        <p className="text-muted-foreground">
          Seguimiento y análisis centralizado de menciones en diferentes plataformas de medios
        </p>
      </div>
      
      <MediaMonitoringProcess />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full md:w-auto grid grid-cols-2 md:grid-cols-4 gap-2">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="targets">Objetivos</TabsTrigger>
          <TabsTrigger value="processing">Procesamiento</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            <MediaMonitoringDashboard />
          </TabsContent>
          
          <TabsContent value="targets" className="space-y-6">
            <MonitoringTargetsManager />
          </TabsContent>
          
          <TabsContent value="processing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trabajos de Procesamiento</CardTitle>
                <CardDescription>Estado de los análisis de contenido y procesamiento de notificaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <ProcessingJobsTable 
                  jobs={jobs}
                  jobsCount={jobsCount}
                  isLoadingJobs={isLoadingJobs}
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  page={page}
                  setPage={setPage}
                  pageSize={pageSize}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Registros de Entrega</CardTitle>
                <CardDescription>Estado de entrega de notificaciones a clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryLogsTable 
                  deliveryLogs={deliveryLogs}
                  deliveryLogsCount={deliveryLogsCount}
                  isLoadingDeliveryLogs={isLoadingDeliveryLogs}
                  page={page}
                  setPage={setPage}
                  pageSize={pageSize}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Monitoreo</CardTitle>
                <CardDescription>Personalice los parámetros del sistema de monitoreo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Procesamiento Automático</h3>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="auto-process" className="checkbox" defaultChecked />
                        <label htmlFor="auto-process">Procesar nuevo contenido automáticamente</label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">Umbral de Notificaciones</h3>
                      <div className="flex items-center space-x-2">
                        <select className="select select-bordered w-full">
                          <option value="1">Todas las menciones</option>
                          <option value="2" selected>Importancia media o superior</option>
                          <option value="3">Solo alta importancia</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
