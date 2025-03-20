import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationAnalytics } from "@/hooks/use-notification-processing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";

interface NotificationAnalyticsDashboardProps {
  analytics: NotificationAnalytics | null;
  isLoading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm font-medium">Total Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.totalCount}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm font-medium">Keywords Únicos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.topKeywords.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm font-medium">Fuentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{analytics.sourceDistribution.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm font-medium">Tasa Promedio Apertura</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{calculateAverageOpenRate()}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="volume" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="volume">Volumen</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="sources">Fuentes</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="volume" className="space-y-4">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-4">Volumen de Notificaciones (30 días)</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.volumeByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Notificaciones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="keywords" className="space-y-4">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-4">Keywords Más Frecuentes</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.topKeywords}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="keyword" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" name="Menciones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="sources" className="space-y-4">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-4">Distribución por Fuente</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sourceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="source"
                      label={({ source, count, percent }) => 
                        `${source}: ${count} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {analytics.sourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="engagement" className="space-y-4">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-4">Engagement por Cliente</h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.clientEngagement}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="%" domain={[0, 100]} />
                    <YAxis type="category" dataKey="client" />
                    <Tooltip formatter={(value) => {
                      const numValue = typeof value === 'string' ? parseFloat(value) : value;
                      return [`${numValue.toFixed(1)}%`, 'Tasa de Apertura'];
                    }} />
                    <Bar dataKey="openRate" fill="#ffc658" name="Tasa de Apertura" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default NotificationAnalyticsDashboard;
