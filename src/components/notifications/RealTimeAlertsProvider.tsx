
import React from "react";
import { useRealTimeAlerts } from "@/hooks/use-real-time-alerts";
import { toast } from "@/hooks/use-toast";

interface RealTimeAlertsProviderProps {
  children: React.ReactNode;
}

const RealTimeAlertsProvider: React.FC<RealTimeAlertsProviderProps> = ({ children }) => {
  // Initialize real-time alerts system
  useRealTimeAlerts({
    toastCallback: (title, description) => {
      toast({
        title,
        description,
        variant: "default",
      });
    }
  });
  
  // This component doesn't render anything itself, it just sets up the real-time system
  return <>{children}</>;
};

export default RealTimeAlertsProvider;
