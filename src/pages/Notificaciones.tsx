
import React, { useState, useEffect } from "react";
import { Bell, Archive, MoreHorizontal, Trash2, CheckSquare, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationsList from "@/components/notifications/NotificationsList";
import ClientFilterDropdown from "@/components/notifications/ClientFilterDropdown";
import ClientContext from "@/components/notifications/ClientContext";
import ClientRelevanceAnalysis from "@/components/notifications/ClientRelevanceAnalysis";
import ClientNotificationPreferenceDialog from "@/components/notifications/ClientNotificationPreferenceDialog";
import { NotificationPreferenceFormValues } from "@/components/settings/notifications/NotificationPreferenceForm";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Get client_id from query params if present
  const searchParams = new URLSearchParams(location.search);
  const initialClientId = searchParams.get("client_id");
  
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId);
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
  const [showRelevanceAnalysis, setShowRelevanceAnalysis] = useState(false);
  
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, markAsArchived } = useNotifications();
  
  // Load clients
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, category, subcategory, keywords, created_at")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
  
  // Load selected client details
  const { data: selectedClient, isLoading: isLoadingSelectedClient } = useQuery({
    queryKey: ["client", selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, category, subcategory, keywords, created_at")
        .eq("id", selectedClientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });
  
  // Create notification preference mutation
  const createPreference = async (values: NotificationPreferenceFormValues) => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .insert({
          client_id: values.client_id,
          notification_channels: values.notification_channels,
          frequency: values.frequency,
          threshold: values.threshold,
          sources: values.sources,
          is_active: values.is_active
        })
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Preferencia creada",
        description: "La preferencia de notificación ha sido creada exitosamente."
      });
      
      setShowPreferenceDialog(false);
      
    } catch (error) {
      console.error("Error creating notification preference:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la preferencia de notificación.",
        variant: "destructive"
      });
    }
  };
  
  // Update URL when selected client changes
  useEffect(() => {
    const newUrl = selectedClientId 
      ? `${location.pathname}?client_id=${selectedClientId}`
      : location.pathname;
    
    navigate(newUrl, { replace: true });
  }, [selectedClientId, location.pathname, navigate]);
  
  // Filter notifications based on selected client and tab
  const filteredNotifications = notifications
    .filter(notification => {
      // Filter by client if selected
      if (selectedClientId && notification.clientId !== selectedClientId) {
        return false;
      }
      
      // Filter by tab
      if (activeTab === "unread") return notification.status === "unread";
      if (activeTab === "archived") return notification.status === "archived";
      return true; // "all" tab
    });
  
  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };
  
  const handleClientChange = (clientId: string | null) => {
    setSelectedClientId(clientId);
  };
  
  const handleCreatePreference = () => {
    setShowPreferenceDialog(true);
  };
  
  const handleViewRelevance = () => {
    setShowRelevanceAnalysis(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Notificaciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Gestión de notificaciones y alertas importantes
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <ClientFilterDropdown
            clients={clients || []}
            selectedClient={selectedClientId}
            onSelectClient={handleClientChange}
            isLoading={isLoadingClients}
          />
          <Button 
            variant="outline" 
            className="gap-2 shrink-0"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Marcar todo como leído</span>
          </Button>
        </div>
      </div>

      {/* Show client context if a client is selected */}
      {selectedClientId && (
        <ClientContext
          client={selectedClient}
          isLoading={isLoadingSelectedClient}
          onCreatePreference={handleCreatePreference}
          onTestNotifications={handleViewRelevance}
        />
      )}
      
      {/* Show client relevance analysis */}
      {showRelevanceAnalysis && selectedClient && (
        <ClientRelevanceAnalysis
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          onClose={() => setShowRelevanceAnalysis(false)}
        />
      )}

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
                  onNotificationClick={handleNotificationClick}
                  showClientInfo={!selectedClientId}
                />
              </div>
            </TabsContent>
            <TabsContent value="unread" className="m-0">
              <div className="border rounded-md overflow-hidden">
                <NotificationsList 
                  notifications={filteredNotifications} 
                  isLoading={isLoading} 
                  onNotificationClick={handleNotificationClick}
                  showClientInfo={!selectedClientId}
                />
              </div>
            </TabsContent>
            <TabsContent value="archived" className="m-0">
              <div className="border rounded-md overflow-hidden">
                <NotificationsList 
                  notifications={filteredNotifications} 
                  isLoading={isLoading} 
                  onNotificationClick={handleNotificationClick}
                  showClientInfo={!selectedClientId}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Notification Preference Dialog */}
      {selectedClient && (
        <ClientNotificationPreferenceDialog
          open={showPreferenceDialog}
          onOpenChange={setShowPreferenceDialog}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          onSubmit={createPreference}
        />
      )}
    </div>
  );
};

export default Notificaciones;
