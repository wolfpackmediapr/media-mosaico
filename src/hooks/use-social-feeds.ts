import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSocialFeedError } from "@/services/social/error-handler";
import { useState } from "react";
import { transformArticlesToPosts, transformPlatformData, calculatePlatformCounts } from "@/services/social/utils";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { SOCIAL_PLATFORMS, fetchSocialPosts, fetchPlatformsData, fetchPlatformCounts } from "@/services/social/api";

// Add the useSocialFeeds hook for the RedesSociales page
export function useSocialFeeds() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Fetch posts with filtering and pagination
  const fetchPosts = async (page = 1, searchTerm = "", selectedPlatforms: string[] = []) => {
    console.log('Fetching posts with:', { page, searchTerm, selectedPlatforms });
    try {
      // Fetch posts using the API function
      const { data, count } = await fetchSocialPosts(page, searchTerm, selectedPlatforms);
      
      // Update total count
      if (count !== null) {
        setTotalCount(count);
      }
      
      // Transform articles to posts
      return transformArticlesToPosts(data || []);
    } catch (error) {
      console.error('Error fetching social posts:', error);
      return [];
    }
  };
  
  // Fetch available platforms and their post counts
  const fetchPlatforms = async (): Promise<SocialPlatform[]> => {
    try {
      // First get all feed sources that match our social platforms
      console.log('Fetching platforms data...');
      const feedSources = await fetchPlatformsData();
      
      // Then fetch all articles from these feed sources to calculate counts
      console.log('Fetching platform counts...');
      const articles = await fetchPlatformCounts();
      
      // Calculate counts for each platform (based on feed source name)
      const platformCounts = calculatePlatformCounts(articles || []);
      
      // Transform the data to match the SocialPlatform type with counts
      return transformPlatformData(feedSources || [], platformCounts);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      return [];
    }
  };
  
  // Manual refresh function - updates to use process-social-feeds
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
