
import React from "react";
import { useRealTimeSubscriptions } from "@/components/notifications/hooks/use-real-time-subscriptions";

/**
 * Provider component that sets up real-time alert subscriptions
 * This centralizes all realtime subscriptions in one place
 */
export const RealTimeAlertsProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Set up all real-time subscriptions
  useRealTimeSubscriptions();
  
  // Just render children, this component only handles subscriptions
  return <>{children}</>;
};
