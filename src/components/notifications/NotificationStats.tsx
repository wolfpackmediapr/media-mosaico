
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NotificationStatsProps {
  selectedClientId: string | null;
  notifications: any[];
  unreadCount: number;
}

const NotificationStats = ({ selectedClientId, notifications, unreadCount }: NotificationStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Todas</CardTitle>
          <CardDescription>Todas las notificaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-3xl font-bold">
            {selectedClientId 
              ? notifications.filter(n => n.clientId === selectedClientId).length 
              : notifications.length}
          </span>
        </CardContent>
      </Card>

      <Card className="dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sin leer</CardTitle>
          <CardDescription>Notificaciones pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-3xl font-bold">
            {selectedClientId 
              ? notifications.filter(n => n.status === "unread" && n.clientId === selectedClientId).length 
              : unreadCount}
          </span>
        </CardContent>
      </Card>

      <Card className="dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Archivadas</CardTitle>
          <CardDescription>Notificaciones archivadas</CardDescription>
        </CardHeader>
        <CardContent>
          <span className="text-3xl font-bold">
            {selectedClientId 
              ? notifications.filter(n => n.status === "archived" && n.clientId === selectedClientId).length 
              : notifications.filter(n => n.status === "archived").length}
          </span>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationStats;
