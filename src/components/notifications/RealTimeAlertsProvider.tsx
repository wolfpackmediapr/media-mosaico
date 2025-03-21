
import React, { useState, useEffect } from "react";
import { useRealTimeSubscriptions } from "./hooks/use-real-time-subscriptions";

interface RealTimeAlertsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up real-time notification alerts
 * Should be mounted near the root of the application
 */
const RealTimeAlertsProvider: React.FC<RealTimeAlertsProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  // Set up real-time subscriptions
  useRealTimeSubscriptions();
  
  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return <>{children}</>;
  
  return <>{children}</>;
};

export default RealTimeAlertsProvider;
