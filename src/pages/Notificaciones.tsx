
import React, { useState } from "react";
import { Bell, Archive, MoreHorizontal, Trash2, CheckSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import NotificationsList from "@/components/notifications/NotificationsList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Notificaciones = () => {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, markAsArchived } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "unread") return notification.status === "unread";
    if (activeTab === "archived") return notification.status === "archived";
    return true; // "all" tab
  });

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Notificaciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Gestión de notificaciones y alertas importantes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0}
          >
            <CheckSquare className="h-4 w-4" />
            Marcar todo como leído
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Todas</CardTitle>
            <CardDescription>Todas las notificaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{notifications.length}</span>
          </CardContent>
        </Card>

        <Card className="dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sin leer</CardTitle>
            <CardDescription>Notificaciones pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{unreadCount}</span>
          </CardContent>
        </Card>

        <Card className="dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Archivadas</CardTitle>
            <CardDescription>Notificaciones archivadas</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {notifications.filter(n => n.status === "archived").length}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Notificaciones</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="flex items-center gap-2"
                  onClick={() => markAllAsRead()}
                  disabled={unreadCount === 0}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Marcar todo como leído</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar todas</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pb-4 pt-2">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                Todas
                <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                Sin leer
                <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archivadas
                <Badge variant="secondary" className="ml-2">
                  {notifications.filter(n => n.status === "archived").length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="m-0">
              <div className="border rounded-md overflow-hidden">
                <NotificationsList 
                  notifications={filteredNotifications} 
                  isLoading={isLoading} 
                  onNotificationClick={handleNotificationClick}
                />
              </div>
            </TabsContent>
            <TabsContent value="unread" className="m-0">
              <div className="border rounded-md overflow-hidden">
                <NotificationsList 
                  notifications={filteredNotifications} 
                  isLoading={isLoading} 
                  onNotificationClick={handleNotificationClick}
                />
              </div>
            </TabsContent>
            <TabsContent value="archived" className="m-0">
              <div className="border rounded-md overflow-hidden">
                <NotificationsList 
                  notifications={filteredNotifications} 
                  isLoading={isLoading} 
                  onNotificationClick={handleNotificationClick}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notificaciones;
