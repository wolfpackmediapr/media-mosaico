
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3, Bell, Settings } from "lucide-react";
import ProcessingJobsTable from "./ProcessingJobsTable";
import DeliveryLogsTable from "./DeliveryLogsTable";
import NotificationAnalyticsDashboard from "@/components/notifications/NotificationAnalyticsDashboard";
import NotificationPreferenceWizard from "@/components/notifications/NotificationPreferenceWizard";

interface MonitoringTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  jobs: any[];
  jobsCount: number;
  isLoadingJobs: boolean;
  deliveryLogs: any[];
  deliveryLogsCount: number;
  isLoadingDeliveryLogs: boolean;
  analytics: any;
  isLoadingAnalytics: boolean;
  activeFilter: string | undefined;
  setActiveFilter: (value: string | undefined) => void | React.Dispatch<React.SetStateAction<"pending" | "processing" | "completed" | "failed" | undefined>>;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  clients: any[];
  createPreference: any;
  isPending: boolean;
}

const MonitoringTabs = ({
  activeTab,
  setActiveTab,
  jobs,
  jobsCount,
  isLoadingJobs,
  deliveryLogs,
  deliveryLogsCount,
  isLoadingDeliveryLogs,
  analytics,
  isLoadingAnalytics,
  activeFilter,
  setActiveFilter,
  page,
  setPage,
  pageSize,
  clients,
  createPreference,
  isPending
}: MonitoringTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Analíticas</span>
        </TabsTrigger>
        <TabsTrigger value="processing" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Procesamiento</span>
        </TabsTrigger>
        <TabsTrigger value="delivery" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Entregas</span>
        </TabsTrigger>
        <TabsTrigger value="wizard" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configuración</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics">
        <NotificationAnalyticsDashboard 
          analytics={analytics} 
          isLoading={isLoadingAnalytics} 
        />
      </TabsContent>

      <TabsContent value="processing">
        <Card>
          <CardHeader>
            <CardTitle>Procesamiento de Contenido</CardTitle>
            <CardDescription>
              Monitoreo de los trabajos de procesamiento de contenido para notificaciones
            </CardDescription>
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
      </TabsContent>

      <TabsContent value="delivery">
        <Card>
          <CardHeader>
            <CardTitle>Entregas de Notificaciones</CardTitle>
            <CardDescription>
              Registro de las entregas de notificaciones a través de canales externos
            </CardDescription>
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

      <TabsContent value="wizard">
        <NotificationPreferenceWizard 
          clients={clients || []} 
          onSave={(preferences) => createPreference.mutate(preferences)}
          isSubmitting={isPending}
        />
      </TabsContent>
    </Tabs>
  );
};

export default MonitoringTabs;
