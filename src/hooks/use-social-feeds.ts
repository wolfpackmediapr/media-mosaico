import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSocialFeedError } from "@/services/social/error-handler";
import { useState, useCallback } from "react";
import { transformArticlesToPosts, transformPlatformData, calculatePlatformCounts } from "@/services/social/utils";
import { fetchSocialPosts, fetchPlatformsData, fetchPlatformCounts } from "@/services/social/api";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { ITEMS_PER_PAGE } from "@/services/social/api";

// Add the useSocialFeeds hook for the RedesSociales page
export function useSocialFeeds() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Fetch posts with filtering and pagination
  const fetchPosts = useCallback(async (page = 1, searchTerm = "", selectedPlatforms: string[] = []) => {
    console.log('Fetching posts with:', { page, searchTerm, selectedPlatforms });
    
    try {
      const { data, count } = await fetchSocialPosts(page, searchTerm, selectedPlatforms);
      
      if (count !== null) {
        setTotalCount(count);
      }
      
      // Transform the data to match the SocialPost type
      return transformArticlesToPosts(data || []);
    } catch (error) {
      console.error("Error in fetchPosts:", error);
      handleSocialFeedError(error, "posts");
      throw error;
    }
  }, []);
  
  // Fetch available platforms
  const fetchPlatforms = useCallback(async () => {
    try {
      // Get platform data
      const feedSources = await fetchPlatformsData();
      
      // Fetch articles to calculate counts per platform
      const articles = await fetchPlatformCounts();
      
      // Calculate platform counts from the articles
      const platformCounts = calculatePlatformCounts(articles || []);
      
      // Transform the data to match the SocialPlatform type
      return transformPlatformData(feedSources || [], platformCounts);
    } catch (error) {
      console.error("Error in fetchPlatforms:", error);
      handleSocialFeedError(error, "platforms");
      throw error;
    }
  }, []);
  
  // Manual refresh function
  const refreshFeeds = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Call the edge function to refresh feeds
      const { error } = await supabase.functions.invoke("process-social-feeds", {
        body: { 
          timestamp: new Date().toISOString(),
          forceFetch: true
        }
      });
      
      if (error) throw error;
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      // Invalidate and refetch data
      await Promise.all([
        fetchPlatforms(),
        fetchPosts()
      ]);
      
      return { success: true };
    } catch (error) {
      console.error("Error refreshing feeds:", error);
      handleSocialFeedError(error, "refresh");
      return { success: false };
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPlatforms, fetchPosts]);
  
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
