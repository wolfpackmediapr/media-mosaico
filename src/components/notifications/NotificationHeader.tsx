
import React from "react";
import { Bell, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClientFilterDropdown from "@/components/notifications/ClientFilterDropdown";

interface NotificationHeaderProps {
  clients: { id: string; name: string; category: string }[];
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void;
  unreadCount: number;
  onMarkAllAsRead: () => void;
  isLoadingClients: boolean;
}

const NotificationHeader = ({
  clients,
  selectedClientId,
  onClientChange,
  unreadCount,
  onMarkAllAsRead,
  isLoadingClients
}: NotificationHeaderProps) => {
  return (
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
          onSelectClient={onClientChange}
          isLoading={isLoadingClients}
        />
        <Button 
          variant="outline" 
          className="gap-2 shrink-0"
          onClick={onMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Marcar todo como leído</span>
        </Button>
      </div>
    </div>
  );
};

export default NotificationHeader;
