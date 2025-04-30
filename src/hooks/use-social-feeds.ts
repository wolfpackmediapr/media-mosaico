import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSocialFeedError } from "@/services/social/error-handler";
import { useState, useCallback } from "react";
import { transformArticlesToPosts, transformPlatformData, calculatePlatformCounts } from "@/services/social/utils";
import { fetchSocialPosts, fetchPlatformsData, fetchPlatformCounts } from "@/services/social/api";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { ITEMS_PER_PAGE } from "@/services/social/api";
import { toast } from "sonner";

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
      // Return empty array instead of throwing to prevent component crashes
      return [];
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
      // Return empty array instead of throwing to prevent component crashes
      return [];
    }
  }, []);
  
  // Manual refresh function with better error handling
  const refreshFeeds = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      // Define an abort controller for timeout handling
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 second timeout
      
      try {
        // Call the edge function without passing the signal directly
        const { error } = await supabase.functions.invoke("process-social-feeds", {
          body: { 
            timestamp: new Date().toISOString(),
            forceFetch: true
          }
        });
        
        clearTimeout(timeoutId);
        
        if (error) throw error;
      } catch (invocationError: any) {
        console.error("Edge function invocation error:", invocationError);
        
        // If it's an abort error, show timeout message
        if (invocationError.name === 'AbortError' || abortController.signal.aborted) {
          toast.error("La actualización de feeds tomó demasiado tiempo. Por favor, inténtalo de nuevo más tarde.");
        } else {
          toast.error("Error al actualizar feeds de redes sociales");
        }
        
        throw invocationError;
      }
      
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
  
  // Use queries for data fetching with proper error handling
  const { 
    data: platforms = [], 
    isLoading: isPlatformsLoading,
    error: platformsError 
  } = useQuery({
    queryKey: ["social-platforms"],
    queryFn: fetchPlatforms,
    retry: 2,
    refetchOnWindowFocus: false,
    // Handle internal TanStack Query errors
    meta: {
      onError: (error) => {
        console.error("Query error loading platforms:", error);
        toast.error("Error al cargar plataformas");
      }
    }
  });
  
  const { 
    data: posts = [], 
    isLoading: isPostsLoading,
    error: postsError 
  } = useQuery({
    queryKey: ["social-posts"],
    queryFn: () => fetchPosts(),
    retry: 2,
    refetchOnWindowFocus: false,
    // Handle internal TanStack Query errors
    meta: {
      onError: (error) => {
        console.error("Query error loading posts:", error);
        toast.error("Error al cargar publicaciones");
      }
    }
  });
  
  // Log errors if they occur
  if (platformsError) console.error("Platform query error:", platformsError);
  if (postsError) console.error("Posts query error:", postsError);
  
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
