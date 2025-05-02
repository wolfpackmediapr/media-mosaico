
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for refreshing social feeds
 */
export function useRefreshFeeds() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  
  /**
   * Manual refresh function - updates to use process-social-feeds
   */
  const refreshFeeds = async () => {
    try {
      setIsRefreshing(true);
      const { error } = await supabase.functions.invoke("process-social-feeds", {
        body: { 
          timestamp: new Date().toISOString(),
          forceFetch: true
        }
      });
      
      if (error) throw error;
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      return { success: true };
    } catch (error) {
      console.error("Error refreshing feeds:", error);
      return { success: false };
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    refreshFeeds,
    isRefreshing,
    lastRefreshTime
  };
}
