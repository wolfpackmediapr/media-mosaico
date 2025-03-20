
import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/use-notifications";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

// Import our components
import NotificationHeader from "@/components/notifications/NotificationHeader";
import NotificationStats from "@/components/notifications/NotificationStats";
import NotificationTabs from "@/components/notifications/NotificationTabs";
import NotificationActions from "@/components/notifications/NotificationActions";
import ClientSelectionHandler from "@/components/notifications/ClientSelectionHandler";
import RelevanceAnalysisWrapper from "@/components/notifications/RelevanceAnalysisWrapper";
import NotificationPreferenceDialogWrapper from "@/components/notifications/NotificationPreferenceDialogWrapper";

const Notificaciones = () => {
  const location = useLocation();
  
  // Get client_id from query params if present
  const searchParams = new URLSearchParams(location.search);
  const initialClientId = searchParams.get("client_id");
  
  const [activeTab, setActiveTab] = useState("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId);
  const [showPreferenceDialog, setShowPreferenceDialog] = useState(false);
  const [showRelevanceAnalysis, setShowRelevanceAnalysis] = useState(false);
  
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
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

      <ClientSelectionHandler
        selectedClientId={selectedClientId}
        selectedClient={selectedClient}
        isLoadingSelectedClient={isLoadingSelectedClient}
        onCreatePreference={handleCreatePreference}
        onTestNotifications={handleViewRelevance}
        onClientChange={handleClientChange}
      />
      
      <RelevanceAnalysisWrapper 
        showRelevanceAnalysis={showRelevanceAnalysis}
        setShowRelevanceAnalysis={setShowRelevanceAnalysis}
        selectedClient={selectedClient}
      />

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
      
      <NotificationPreferenceDialogWrapper
        showPreferenceDialog={showPreferenceDialog}
        setShowPreferenceDialog={setShowPreferenceDialog}
        selectedClient={selectedClient}
      />
    </div>
  );
};

export default Notificaciones;
