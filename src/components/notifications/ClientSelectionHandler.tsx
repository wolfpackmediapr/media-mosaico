
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ClientContext from "./ClientContext";

interface ClientSelectionHandlerProps {
  selectedClientId: string | null;
  selectedClient: any;
  isLoadingSelectedClient: boolean;
  onCreatePreference: () => void;
  onTestNotifications: () => void;
  onClientChange: (clientId: string | null) => void;
}

const ClientSelectionHandler = ({
  selectedClientId,
  selectedClient,
  isLoadingSelectedClient,
  onCreatePreference,
  onTestNotifications,
  onClientChange
}: ClientSelectionHandlerProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Update URL when selected client changes
  useEffect(() => {
    const newUrl = selectedClientId 
      ? `${location.pathname}?client_id=${selectedClientId}`
      : location.pathname;
    
    navigate(newUrl, { replace: true });
  }, [selectedClientId, location.pathname, navigate]);

  if (!selectedClientId) return null;

  return (
    <ClientContext
      client={selectedClient}
      isLoading={isLoadingSelectedClient}
      onCreatePreference={onCreatePreference}
      onTestNotifications={onTestNotifications}
    />
  );
};

export default ClientSelectionHandler;
