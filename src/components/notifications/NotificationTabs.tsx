
import React from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, CheckSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotificationsList from "@/components/notifications/NotificationsList";

interface NotificationTabsProps {
  notifications: any[];
  filteredNotifications: any[];
  activeTab: string;
  setActiveTab: (value: string) => void;
  isLoading: boolean;
  onNotificationClick: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  selectedClientId: string | null;
}

const NotificationTabs = ({
  notifications,
  filteredNotifications,
  activeTab,
  setActiveTab,
  isLoading,
  onNotificationClick,
  markAllAsRead,
  unreadCount,
  selectedClientId
}: NotificationTabsProps) => {
  return (
    <CardContent className="pb-4 pt-2">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            Todas
            <Badge variant="secondary" className="ml-2">
              {selectedClientId 
                ? notifications.filter(n => n.clientId === selectedClientId).length 
                : notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Sin leer
            <Badge variant="secondary" className="ml-2">
              {selectedClientId 
                ? notifications.filter(n => n.status === "unread" && n.clientId === selectedClientId).length 
                : unreadCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archivadas
            <Badge variant="secondary" className="ml-2">
              {selectedClientId 
                ? notifications.filter(n => n.status === "archived" && n.clientId === selectedClientId).length 
                : notifications.filter(n => n.status === "archived").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="m-0">
          <div className="border rounded-md overflow-hidden">
            <NotificationsList 
              notifications={filteredNotifications} 
              isLoading={isLoading} 
              onNotificationClick={onNotificationClick}
              showClientInfo={!selectedClientId}
            />
          </div>
        </TabsContent>
        <TabsContent value="unread" className="m-0">
          <div className="border rounded-md overflow-hidden">
            <NotificationsList 
              notifications={filteredNotifications} 
              isLoading={isLoading} 
              onNotificationClick={onNotificationClick}
              showClientInfo={!selectedClientId}
            />
          </div>
        </TabsContent>
        <TabsContent value="archived" className="m-0">
          <div className="border rounded-md overflow-hidden">
            <NotificationsList 
              notifications={filteredNotifications} 
              isLoading={isLoading} 
              onNotificationClick={onNotificationClick}
              showClientInfo={!selectedClientId}
            />
          </div>
        </TabsContent>
      </Tabs>
    </CardContent>
  );
};

export default NotificationTabs;
