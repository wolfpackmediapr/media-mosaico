
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { SocialPost, SocialPlatform } from "@/types/social";
import { 
  fetchPlatformsData, 
  fetchPlatformCounts, 
  fetchSocialPosts, 
  refreshSocialFeeds,
  ITEMS_PER_PAGE
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

  const fetchPlatforms = async () => {
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
        
        setPlatforms(platformsData);
      }
    } catch (error) {
      handleSocialFeedError(error, 'platforms', toast);
    }
  };

  const fetchPosts = async (page: number, searchTerm: string = '', selectedPlatforms: string[] = []) => {
    try {
      console.log('Fetching posts for page:', page, 'search:', searchTerm, 'platforms:', selectedPlatforms);
      setIsLoading(true);
      
      // Fetch posts with filters
      const { data, count } = await fetchSocialPosts(page, searchTerm, selectedPlatforms);
      
      setTotalCount(count);

      if (data) {
        // Transform the data to include platform information
        const transformedPosts = transformArticlesToPosts(data);
        setPosts(transformedPosts);
      }

      // Fetch platforms with counts
      await fetchPlatforms();
    } catch (error) {
      handleSocialFeedError(error, 'posts', toast);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing social feeds...');
      
      // Call the refresh function
      const data = await refreshSocialFeeds();
      
      console.log('Social feed refresh response:', data);
      
      // Reset to first page after refresh
      await fetchPosts(1);
      await fetchPlatforms();

      toast({
        title: "¡Éxito!",
        description: "Feeds de redes sociales actualizados correctamente",
      });
    } catch (error) {
      handleSocialFeedError(error, 'refresh', toast);
    } finally {
      setIsRefreshing(false);
    }
  };

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
