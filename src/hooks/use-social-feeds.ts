
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { getCachedData, saveCacheData } from "@/utils/cache-utils";

export const useSocialFeeds = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for platforms
  const { 
    data: platforms = [], 
    isLoading: isPlatformsLoading 
  } = useQuery({
    queryKey: ['socialPlatforms'],
    queryFn: async () => {
      try {
        // Check cache first
        const cachedPlatforms = getCachedData('socialPlatforms');
        if (cachedPlatforms) {
          console.log('Using cached social platforms');
          return cachedPlatforms;
        }

        // Fetch platform data
        const platformData = await fetchPlatformsData();
        
        if (platformData) {
          // Fetch platform counts
          const articles = await fetchPlatformCounts();
          
          // Calculate counts by platform
          const platformCounts = calculatePlatformCounts(articles || []);
          
          // Transform data to SocialPlatform format
          const transformedPlatforms = transformPlatformData(platformData, platformCounts);
          
          // Save to cache
          saveCacheData('socialPlatforms', transformedPlatforms);
          
          return transformedPlatforms;
        }
        return [];
      } catch (error) {
        handleSocialFeedError(error, 'platforms', toast);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for posts
  const fetchPostsQuery = (page: number, searchTerm: string = '', selectedPlatforms: string[] = []) => {
    return useQuery({
      queryKey: ['socialPosts', page, searchTerm, selectedPlatforms],
      queryFn: async () => {
        try {
          console.log('Fetching posts for page:', page, 'search:', searchTerm, 'platforms:', selectedPlatforms);
          
          // Check cache for non-filtered requests
          if (!searchTerm && selectedPlatforms.length === 0) {
            const cacheKey = `socialPosts_page_${page}`;
            const cachedPosts = getCachedData(cacheKey);
            if (cachedPosts) {
              console.log('Using cached social posts for page', page);
              return cachedPosts;
            }
          }
          
          // Fetch posts with filters
          const { data, count } = await fetchSocialPosts(page, searchTerm, selectedPlatforms);
          
          if (!data || data.length === 0) {
            return { posts: [], totalCount: 0 };
          }

          // Transform the data to include platform information
          const transformedPosts = transformArticlesToPosts(data);
          const result = { 
            posts: transformedPosts, 
            totalCount: count || 0 
          };
          
          // Save to cache for non-filtered requests
          if (!searchTerm && selectedPlatforms.length === 0) {
            saveCacheData(`socialPosts_page_${page}`, result);
          }
          
          return result;
        } catch (error) {
          handleSocialFeedError(error, 'posts', toast);
          return { posts: [], totalCount: 0 };
        }
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      placeholderData: (previousData) => previousData // This replaces keepPreviousData
    });
  };

  // Mutation for refreshing feeds
  const refreshFeedsMutation = useMutation({
    mutationFn: refreshSocialFeeds,
    onMutate: () => {
      setIsRefreshing(true);
      console.log('Refreshing social feeds...');
    },
    onSuccess: async () => {
      console.log('Social feeds refreshed successfully');
      
      // Invalidate queries to refetch data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['socialPosts'] }),
        queryClient.invalidateQueries({ queryKey: ['socialPlatforms'] })
      ]);

      toast({
        title: "¡Éxito!",
        description: "Feeds de redes sociales actualizados correctamente",
      });
    },
    onError: (error) => {
      handleSocialFeedError(error, 'refresh', toast);
    },
    onSettled: () => {
      setIsRefreshing(false);
    }
  });

  const refreshFeeds = () => {
    refreshFeedsMutation.mutate();
  };

  return {
    platforms,
    isPlatformsLoading,
    fetchPostsQuery,
    isRefreshing,
    refreshFeeds,
  };
};
