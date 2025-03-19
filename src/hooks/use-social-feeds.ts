
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { 
  fetchPlatformsData, 
  fetchPlatformCounts, 
  fetchSocialPosts, 
  refreshSocialFeeds,
  ITEMS_PER_PAGE,
  SOCIAL_FEEDS 
} from "@/services/social/api";
import { 
  transformArticlesToPosts, 
  transformPlatformData, 
  calculatePlatformCounts 
} from "@/services/social/utils";
import { handleSocialFeedError } from "@/services/social/error-handler";

export const useSocialFeeds = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  
  // Use refs to avoid unnecessary rerendering in callbacks
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const fetchPlatforms = useCallback(async () => {
    try {
      // Fetch platform data
      const platformData = await fetchPlatformsData();
      
      if (platformData) {
        // Fetch platform counts
        const articles = await fetchPlatformCounts();
        
        // Calculate counts by platform
        const platformCounts = calculatePlatformCounts(articles || []);
        
        // Transform data to SocialPlatform format
        const platformsData = transformPlatformData(platformData, platformCounts);
        
        console.log('Platforms data:', platformsData);
        setPlatforms(platformsData);
      }
    } catch (error) {
      handleSocialFeedError(error, 'platforms', toastRef.current);
    }
  }, []);

  const fetchPosts = useCallback(async (page: number, searchTerm: string = '', selectedPlatforms: string[] = []) => {
    try {
      console.log('Fetching posts for page:', page, 'search:', searchTerm, 'platforms:', selectedPlatforms);
      setIsLoading(true);
      
      // Fetch posts with filters
      const { data, count } = await fetchSocialPosts(page, searchTerm, selectedPlatforms);
      console.log('Fetched posts data:', data?.length || 0, 'items', 'Total count:', count);
      
      setTotalCount(count);

      if (data) {
        // Log source names to debug which feeds are coming through
        const sourcesFound = [...new Set(data.map(item => item.feed_source?.name))];
        console.log('Sources found in data:', sourcesFound);
        
        // Transform the data to include platform information
        const transformedPosts = transformArticlesToPosts(data);
        setPosts(transformedPosts);
      }

      // Fetch platforms with counts
      await fetchPlatforms();
    } catch (error) {
      handleSocialFeedError(error, 'posts', toastRef.current);
      // Set empty posts in case of error
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPlatforms]);

  const refreshFeeds = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing social feeds...');
      console.log('Available social feeds:', SOCIAL_FEEDS);
      
      // Call the refresh function
      const data = await refreshSocialFeeds();
      
      console.log('Social feed refresh response:', data);
      
      // Reset to first page after refresh
      await fetchPosts(1);

      toastRef.current({
        title: "¡Éxito!",
        description: "Feeds de redes sociales actualizados correctamente",
      });
    } catch (error) {
      handleSocialFeedError(error, 'refresh', toastRef.current);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchPosts]);

  return {
    posts,
    platforms,
    isLoading,
    isRefreshing,
    totalCount,
    fetchPosts,
    fetchPlatforms,
    refreshFeeds,
  };
};
