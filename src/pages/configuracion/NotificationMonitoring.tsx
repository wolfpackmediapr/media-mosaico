
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Activity, AlertCircle, Archive, BarChart3, Bell, ChevronLeft, ChevronRight, Clock, Filter, Loader2, Settings, Users } from "lucide-react";
import { useNotificationProcessing } from "@/hooks/use-notification-processing";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import NotificationAnalyticsDashboard from "@/components/notifications/NotificationAnalyticsDashboard";
import NotificationPreferenceWizard from "@/components/notifications/NotificationPreferenceWizard";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const NotificationMonitoring = () => {
  const {
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
    setPageSize
  } = useNotificationProcessing();

  const {
    preferences,
    isLoading: isLoadingPreferences,
    clients,
    createPreference,
    isPending
  } = useNotificationPreferences();

  const [activeTab, setActiveTab] = useState("analytics");

  // Format date utility function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pendiente</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Procesando</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completado</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Fallido</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Enviado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Content type display
  const getContentTypeDisplay = (type: string) => {
    switch (type) {
      case 'news': return 'Noticias';
      case 'social': return 'Redes Sociales';
      case 'radio': return 'Radio';
      case 'tv': return 'TV';
      case 'press': return 'Prensa';
      default: return type;
    }
  };

  // Channel display
  const getChannelDisplay = (channel: string) => {
    switch (channel) {
      case 'email': return 'Correo electrónico';
      case 'sms': return 'SMS';
      case 'push': return 'Notificación push';
      case 'in_app': return 'En la aplicación';
      default: return channel;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoreo de Notificaciones</h1>
          <p className="text-muted-foreground">
            Analice, monitoree y optimice el sistema de notificaciones
          </p>
        </div>
      </div>

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
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter">Filtrar por estado:</Label>
                  <Select 
                    value={activeFilter || "all"}
                    onValueChange={(value) => setActiveFilter(value === "all" ? undefined : value as any)}
                  >
                    <SelectTrigger id="status-filter" className="w-[180px]">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="processing">Procesando</SelectItem>
                      <SelectItem value="completed">Completados</SelectItem>
                      <SelectItem value="failed">Fallidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {page + 1} de {Math.max(1, Math.ceil(jobsCount / pageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= jobsCount}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo de Contenido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Procesado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingJobs ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          <span className="mt-2 text-sm text-muted-foreground block">Cargando trabajos...</span>
                        </TableCell>
                      </TableRow>
                    ) : jobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">No se encontraron trabajos de procesamiento</span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-mono text-xs">{job.id.substring(0, 8)}...</TableCell>
                          <TableCell>{getContentTypeDisplay(job.content_type)}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>{formatDate(job.created_at)}</TableCell>
                          <TableCell>{job.processed_at ? formatDate(job.processed_at) : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
              <div className="flex justify-end items-center mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {page + 1} de {Math.max(1, Math.ceil(deliveryLogsCount / pageSize))}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= deliveryLogsCount}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notificación</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Enviado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingDeliveryLogs ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          <span className="mt-2 text-sm text-muted-foreground block">Cargando registros de entrega...</span>
                        </TableCell>
                      </TableRow>
                    ) : deliveryLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <Archive className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">No se encontraron registros de entrega</span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      deliveryLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="max-w-xs truncate" title={log.client_alerts?.title || ""}>
                            {log.client_alerts?.title || ""}
                          </TableCell>
                          <TableCell>{getChannelDisplay(log.channel)}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{formatDate(log.created_at)}</TableCell>
                          <TableCell>{log.sent_at ? formatDate(log.sent_at) : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
    </div>
  );
};

export default NotificationMonitoring;
