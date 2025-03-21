
import React, { useEffect, useState } from "react";
import { setupNotificationListener } from "@/services/notifications/unifiedNotificationService";

interface RealTimeAlertsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up real-time notification alerts
 * Should be mounted near the root of the application
 */
const RealTimeAlertsProvider: React.FC<RealTimeAlertsProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Set up notification listener that handles all toast notifications
    const unsubscribe = setupNotificationListener();
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  if (!mounted) return <>{children}</>;
  
  return <>{children}</>;
};

export default RealTimeAlertsProvider;
