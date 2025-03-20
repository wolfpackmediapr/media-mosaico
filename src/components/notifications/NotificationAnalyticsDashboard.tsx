
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationAnalytics } from "@/hooks/use-notification-processing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import {
  NotificationVolumeChart,
  KeywordsFrequencyChart,
  SourceDistributionChart,
  ClientEngagementChart,
  NotificationStats
} from "./charts";

interface NotificationAnalyticsDashboardProps {
  analytics: NotificationAnalytics | null;
  isLoading: boolean;
}

const NotificationAnalyticsDashboard: React.FC<NotificationAnalyticsDashboardProps> = ({
  analytics,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analíticas de Notificaciones</CardTitle>
          <CardDescription>Cargando datos de análisis...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analíticas de Notificaciones</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            No hay datos de notificaciones disponibles para mostrar analíticas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const calculateAverageOpenRate = () => {
    if (analytics.clientEngagement.length === 0) return "0%";
    const avgRate = analytics.clientEngagement.reduce((sum, item) => sum + item.openRate, 0) / analytics.clientEngagement.length;
    return `${avgRate.toFixed(1)}%`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analíticas de Notificaciones</CardTitle>
        <CardDescription>
          Análisis y estadísticas de las notificaciones generadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationStats 
          totalCount={analytics.totalCount}
          keywordsCount={analytics.topKeywords.length}
          sourcesCount={analytics.sourceDistribution.length}
          avgOpenRate={calculateAverageOpenRate()}
        />

        <Tabs defaultValue="volume" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="volume">Volumen</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="sources">Fuentes</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="volume" className="space-y-4">
            <NotificationVolumeChart data={analytics.volumeByDay} />
          </TabsContent>
          
          <TabsContent value="keywords" className="space-y-4">
            <KeywordsFrequencyChart data={analytics.topKeywords} />
          </TabsContent>
          
          <TabsContent value="sources" className="space-y-4">
            <SourceDistributionChart data={analytics.sourceDistribution} />
          </TabsContent>
          
          <TabsContent value="engagement" className="space-y-4">
            <ClientEngagementChart data={analytics.clientEngagement} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationAnalyticsDashboard;
