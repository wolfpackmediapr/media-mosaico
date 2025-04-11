
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAuthStatus = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setIsAuthenticated(!!session);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    checkAuth();
  }, []);

  return { isAuthenticated };
};
