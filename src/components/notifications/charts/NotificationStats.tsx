
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface NotificationStatCardProps {
  title: string;
  value: string | number;
}

const NotificationStatCard: React.FC<NotificationStatCardProps> = ({ title, value }) => (
  <Card>
    <CardHeader className="py-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
);

interface NotificationStatsProps {
  totalCount: number;
  keywordsCount: number;
  sourcesCount: number;
  avgOpenRate: string;
}

const NotificationStats: React.FC<NotificationStatsProps> = ({ 
  totalCount, 
  keywordsCount, 
  sourcesCount, 
  avgOpenRate 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <NotificationStatCard title="Total Notificaciones" value={totalCount} />
      <NotificationStatCard title="Keywords Únicos" value={keywordsCount} />
      <NotificationStatCard title="Fuentes" value={sourcesCount} />
      <NotificationStatCard title="Tasa Promedio Apertura" value={avgOpenRate} />
    </div>
  );
};

export default NotificationStats;
