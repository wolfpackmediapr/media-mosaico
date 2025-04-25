
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSocialFeedError } from "@/services/social/error-handler";
import { useState } from "react";

// Add the useSocialFeeds hook for the RedesSociales page
export function useSocialFeeds() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Fetch posts with filtering and pagination
  const fetchPosts = async (page = 1, searchTerm = "", selectedPlatforms: string[] = []) => {
    console.log('Fetching posts with:', { page, searchTerm, selectedPlatforms });
    
    let query = supabase
      .from("news_articles")
      .select("*", { count: "exact" });
      
    // Apply search filter if provided
    if (searchTerm) {
      query = query.ilike("content", `%${searchTerm}%`);
    }
    
    // Apply platform filter if provided
    if (selectedPlatforms.length > 0) {
      query = query.in("feed_source_id", selectedPlatforms);
    }
    
    const { data, count, error } = await query
      .order("pub_date", { ascending: false });
      
    if (error) throw error;
    
    if (count !== null) {
      setTotalCount(count);
    }
    
    return data || [];
  };
  
  // Fetch available platforms
  const fetchPlatforms = async () => {
    const { data, error } = await supabase
      .from("feed_sources")
      .select("*")
      .order("name", { ascending: true });
      
    if (error) throw error;
    
    return data || [];
  };
  
  // Manual refresh function
  const refreshFeeds = async () => {
    try {
      setIsRefreshing(true);
      const { error } = await supabase.functions.invoke("refresh-social-feeds");
      
      if (error) throw error;
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      // Refetch data
      await fetchPlatforms();
      await fetchPosts();
      
      return { success: true };
    } catch (error) {
      console.error("Error refreshing feeds:", error);
      return { success: false };
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Use queries for data fetching
  const { data: platforms = [], isLoading: isPlatformsLoading } = useQuery({
    queryKey: ["social-platforms"],
    queryFn: fetchPlatforms
  });
  
  const { data: posts = [], isLoading: isPostsLoading } = useQuery({
    queryKey: ["social-posts"],
    queryFn: () => fetchPosts()
  });
  
  return {
    posts,
    platforms,
    isLoading: isPlatformsLoading || isPostsLoading,
    isRefreshing,
    totalCount,
    fetchPosts,
    fetchPlatforms,
    refreshFeeds,
    lastRefreshTime
  };
}

export function useSocialPlatforms() {
  return useQuery({
    queryKey: ["social-platforms"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("feed_sources")
          .select("*")
          .order("name", { ascending: true });

        if (error) throw error;

        return data || [];
      } catch (error) {
        handleSocialFeedError(error, "platforms");
        return [];
      }
    },
  });
}

export function useSocialPosts(platformId?: string) {
  return useQuery({
    queryKey: ["social-posts", platformId],
    queryFn: async () => {
      if (!platformId) return [];

      try {
        const { data, error } = await supabase
          .from("news_articles")
          .select("*")
          .eq("feed_source_id", platformId)
          .order("pub_date", { ascending: false });

        if (error) throw error;

        return data || [];
      } catch (error) {
        handleSocialFeedError(error, "posts");
        return [];
      }
    },
    enabled: !!platformId,
  });
}

export function useJayFonsecaFeed() {
  return useQuery({
    queryKey: ["jay-fonseca-feed"],
    queryFn: async () => {
      try {
        const { data: feed, error } = await supabase
          .from("news_articles")
          .select("*")
          .order("pub_date", { ascending: false })
          .limit(20);

        if (error) throw error;

        return feed || [];
      } catch (error) {
        handleSocialFeedError(error, "feed");
        return [];
      }
    },
  });
}

export function useRefreshSocialFeeds() {
  return {
    refreshFeeds: async () => {
      try {
        const { error } = await supabase.functions.invoke("refresh-social-feeds");

        if (error) throw error;

        return { success: true };
      } catch (error) {
        handleSocialFeedError(error, "refresh");
        return { success: false };
      }
    },
  };
}

export function useJayFonsecaRefresh() {
  return {
    refreshFeed: async () => {
      try {
        const { error } = await supabase.functions.invoke("refresh-jay-fonseca");

        if (error) throw error;

        return { success: true };
      } catch (error) {
        handleSocialFeedError(error, "refresh");
        return { success: false };
      }
    },
  };
}
