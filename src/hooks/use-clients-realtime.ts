import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on public.clients and invalidate
 * spotlight + clients queries so any "Menciones de Clientes" feed
 * reflects edits immediately (add/update/delete/toggle active/keywords).
 */
export function useClientsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("clients-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["client-spotlight"] });
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}