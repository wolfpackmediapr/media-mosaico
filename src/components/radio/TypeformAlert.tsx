
import { useState, useEffect } from "react";
import TypeformEmbed from "@/components/typeform/TypeformEmbed";
import { useAuthStatus } from "@/hooks/use-auth-status";

interface TypeformAlertProps {
  isAuthenticated?: boolean | null;
}

const TypeformAlert = ({ isAuthenticated: propIsAuthenticated }: TypeformAlertProps) => {
  // Use the auth hook directly to ensure we have the most current auth state
  const { isAuthenticated: hookIsAuthenticated } = useAuthStatus();
  
  // Use prop if provided, otherwise use the hook value (ensures backward compatibility)
  const [actualAuthState, setActualAuthState] = useState<boolean | null>(propIsAuthenticated ?? hookIsAuthenticated);
  
  // Keep auth state in sync with both sources
  useEffect(() => {
    setActualAuthState(propIsAuthenticated ?? hookIsAuthenticated);
  }, [propIsAuthenticated, hookIsAuthenticated]);
  
  // Add debugging to track component lifecycle
  useEffect(() => {
    console.log("[TypeformAlert] Component mounted, auth state:", actualAuthState);
    return () => {
      console.log("[TypeformAlert] Component unmounting");
    };
  }, []);

  return (
    <TypeformEmbed
      formId="01JEWES3GA7PPQN2SPRNHSVHPG"
      title="Alerta Radio"
      description="Haga clic en el botón a continuación para cargar el formulario de alerta de radio."
      isAuthenticated={actualAuthState}
    />
  );
};

export default TypeformAlert;
