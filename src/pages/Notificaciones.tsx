
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { NotificationPreferenceFormValues } from "@/components/settings/notifications/NotificationPreferenceForm";

// Import our new components
import NotificationHeader from "@/components/notifications/NotificationHeader";
import NotificationStats from "@/components/notifications/NotificationStats";
import NotificationTabs from "@/components/notifications/NotificationTabs";
import NotificationActions from "@/components/notifications/NotificationActions";
import ClientContext from "@/components/notifications/ClientContext";
import ClientRelevanceAnalysis from "@/components/notifications/ClientRelevanceAnalysis";
import ClientNotificationPreferenceDialog from "@/components/notifications/ClientNotificationPreferenceDialog";

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
      <NotificationHeader 
        clients={clients || []}
        selectedClientId={selectedClientId}
        onClientChange={handleClientChange}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
        isLoadingClients={isLoadingClients}
      />

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

      <NotificationStats 
        selectedClientId={selectedClientId}
        notifications={notifications}
        unreadCount={unreadCount}
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Notificaciones</CardTitle>
            <NotificationActions 
              markAllAsRead={markAllAsRead}
              unreadCount={unreadCount}
            />
          </div>
        </CardHeader>
        <NotificationTabs 
          notifications={notifications}
          filteredNotifications={filteredNotifications}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isLoading={isLoading}
          onNotificationClick={handleNotificationClick}
          markAllAsRead={markAllAsRead}
          unreadCount={unreadCount}
          selectedClientId={selectedClientId}
        />
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
