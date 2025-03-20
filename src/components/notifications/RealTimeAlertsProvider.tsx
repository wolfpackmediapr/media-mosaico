
import React, { useEffect, useState } from "react";
import { useRealTimeAlerts } from "@/hooks/use-real-time-alerts";
import { toast } from "@/hooks/use-toast";
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";

interface RealTimeAlertsProviderProps {
  children: React.ReactNode;
}

const RealTimeAlertsProvider: React.FC<RealTimeAlertsProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize real-time alerts system
  useRealTimeAlerts({
    toastCallback: (title, description) => {
      // Show a toast notification
      toast({
        title,
        description,
        variant: "default",
      });
      
      // Also show a Sonner toast for better animation
      sonnerToast(title, {
        description,
        position: "top-right",
        duration: 5000,
        className: "custom-sonner-toast",
      });
    }
  });
  
  if (!mounted) return <>{children}</>;
  
  return (
    <>
      {children}
      <SonnerToaster theme="light" closeButton richColors />
    </>
  );
};

export default RealTimeAlertsProvider;
