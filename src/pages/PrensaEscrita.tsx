
import React, { useEffect } from "react";
import { PressTabsContainer } from "@/components/prensa-escrita";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PrensaEscrita = () => {
  // Demo toast to show user how notifications will appear
  useEffect(() => {
    // Only show the demo notification once per session
    const hasShownDemo = sessionStorage.getItem("has-shown-prensa-demo");
    
    if (!hasShownDemo) {
      // Wait a moment before showing the demo notification
      const timer = setTimeout(() => {
        toast.info("Sistema de notificaciones activo", {
          description: "Recibirás notificaciones cuando se procesen nuevos recortes de prensa",
          duration: 5000,
        });
        sessionStorage.setItem("has-shown-prensa-demo", "true");
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-3xl font-bold tracking-tight">Prensa Escrita</h2>
        <p className="text-muted-foreground">
          Gestión de recortes de prensa y documentos PDF
        </p>
      </div>
      
      <PressTabsContainer />
    </div>
  );
};

export default PrensaEscrita;
