
import React from "react";
import { useRealTimeAlerts } from "@/hooks/use-real-time-alerts";

interface RealTimeAlertsProviderProps {
  children: React.ReactNode;
}

const RealTimeAlertsProvider: React.FC<RealTimeAlertsProviderProps> = ({ children }) => {
  // Initialize real-time alerts system
  useRealTimeAlerts();
  
  // This component doesn't render anything itself, it just sets up the real-time system
  return <>{children}</>;
};

export default RealTimeAlertsProvider;
