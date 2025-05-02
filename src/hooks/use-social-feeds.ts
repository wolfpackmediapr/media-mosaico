
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSocialFeedError } from "@/services/social/error-handler";
import { useState } from "react";
import { transformArticlesToPosts, transformPlatformData, calculatePlatformCounts } from "@/services/social/utils";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { SOCIAL_PLATFORMS } from "@/services/social/api";

// Add the useSocialFeeds hook for the RedesSociales page
export function useSocialFeeds() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Fetch posts with filtering and pagination
  const fetchPosts = async (page = 1, searchTerm = "", selectedPlatforms: string[] = []) => {
    console.log('Fetching posts with:', { page, searchTerm, selectedPlatforms });
    
    // First get all feed sources that match social platforms
    const { data: feedSources, error: sourceError } = await supabase
      .from("feed_sources")
      .select("id, name, platform")
      .in("platform", SOCIAL_PLATFORMS);
      
    if (sourceError) throw sourceError;
    
    const socialFeedSourceIds = feedSources?.map(fs => fs.id) || [];
    console.log('Social feed source IDs:', socialFeedSourceIds);
    
    // If no social feed sources found, return empty result
    if (socialFeedSourceIds.length === 0) {
      console.log('No social feed sources found');
      return { data: [], count: 0 };
    }
    
    let query = supabase
      .from("news_articles")
      .select("*, feed_source:feed_source_id(*)", { count: "exact" })
      .in("feed_source_id", socialFeedSourceIds);
      
    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }
    
    // Apply platform filter if provided
    if (selectedPlatforms.length > 0) {
      // Filter by platform name
      const filteredSourceIds = feedSources
        ?.filter(fs => selectedPlatforms.includes(fs.name))
        .map(fs => fs.id);
      
      if (filteredSourceIds && filteredSourceIds.length > 0) {
        query = query.in("feed_source_id", filteredSourceIds);
      }
    }
    
    const { data, count, error } = await query
      .order("pub_date", { ascending: false });
      
    if (error) throw error;
    
    if (count !== null) {
      setTotalCount(count);
    }
    
    // Transform the data to match the SocialPost type
    return transformArticlesToPosts(data || []);
  };
  
  // Fetch available platforms - filter to only social media platforms
  const fetchPlatforms = async () => {
    const { data: feedSources, error } = await supabase
      .from("feed_sources")
      .select("*")
      .in("platform", SOCIAL_PLATFORMS)
      .order("name", { ascending: true });
      
    if (error) throw error;
    
    console.log('Fetched social platforms:', feedSources);
    
    // Fetch articles to calculate counts per platform, but only for social media sources
    const { data: articles } = await supabase
      .from("news_articles")
      .select("feed_source_id, feed_source:feed_source_id(name, platform)")
      .in("feed_source:feed_source_id.platform", SOCIAL_PLATFORMS);
    
    // Calculate platform counts from the articles
    const platformCounts = calculatePlatformCounts(articles || []);
    
    // Transform the data to match the SocialPlatform type
    return transformPlatformData(feedSources || [], platformCounts);
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
