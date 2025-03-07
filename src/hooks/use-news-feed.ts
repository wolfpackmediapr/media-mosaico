
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NewsArticle, FeedSource } from "@/types/prensa";
import { 
  fetchNewsSourcesFromDatabase, 
  fetchArticlesFromDatabase,
  refreshNewsFeedViaFunction, 
  ITEMS_PER_PAGE 
} from "@/services/news/api";
import { 
  transformSourcesToFeedSources, 
  transformDatabaseArticlesToNewsArticles 
} from "@/services/news/transforms";
import { handleNewsFeedError } from "@/services/news/error-handler";
import { getCachedData, saveCacheData } from "@/utils/cache-utils";

export const useNewsFeed = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for feed sources
  const { 
    data: feedSources = [], 
    isLoading: isSourcesLoading
  } = useQuery({
    queryKey: ['feedSources'],
    queryFn: async () => {
      try {
        // Check cache first
        const cachedSources = getCachedData('feedSources');
        if (cachedSources) {
          console.log('Using cached feed sources');
          return cachedSources;
        }

        const sourcesData = await fetchNewsSourcesFromDatabase();
        const transformedSources = transformSourcesToFeedSources(sourcesData);
        
        // Save to cache
        saveCacheData('feedSources', transformedSources);
        
        return transformedSources;
      } catch (error) {
        handleNewsFeedError(error, "sources", toast);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for articles
  const fetchArticlesQuery = (page: number, searchTerm: string = '') => {
    return useQuery({
      queryKey: ['articles', page, searchTerm],
      queryFn: async () => {
        try {
          console.log('Fetching articles for page:', page, 'search:', searchTerm);
          
          // Check cache first for non-search requests
          if (!searchTerm) {
            const cacheKey = `articles_page_${page}`;
            const cachedArticles = getCachedData(cacheKey);
            if (cachedArticles) {
              console.log('Using cached articles for page', page);
              return cachedArticles;
            }
          }
          
          const { articlesData, count } = await fetchArticlesFromDatabase(page, searchTerm);
          
          if (!articlesData || articlesData.length === 0) {
            console.log('No articles found, setting empty array');
            return { articles: [], totalCount: 0 };
          }
          
          const convertedArticles = transformDatabaseArticlesToNewsArticles(articlesData);
          const result = { 
            articles: convertedArticles, 
            totalCount: count || 0
          };
          
          // Save to cache if not a search request
          if (!searchTerm) {
            saveCacheData(`articles_page_${page}`, result);
          }
          
          console.log('Processed articles:', convertedArticles);
          return result;
        } catch (error) {
          handleNewsFeedError(error, "articles", toast);
          return { articles: [], totalCount: 0 };
        }
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      placeholderData: (previousData) => previousData // This replaces keepPreviousData
    });
  };

  // Mutation for refreshing feed
  const refreshFeedMutation = useMutation({
    mutationFn: refreshNewsFeedViaFunction,
    onMutate: () => {
      setIsRefreshing(true);
      console.log('Refreshing feed...');
    },
    onSuccess: async () => {
      console.log('Feed refreshed successfully');
      
      // Invalidate queries to refetch data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['articles'] }),
        queryClient.invalidateQueries({ queryKey: ['feedSources'] })
      ]);

      toast({
        title: "¡Éxito!",
        description: "Feed de noticias actualizado correctamente",
      });
    },
    onError: (error) => {
      handleNewsFeedError(error, "refresh", toast);
    },
    onSettled: () => {
      setIsRefreshing(false);
    }
  });

  const refreshFeed = () => {
    refreshFeedMutation.mutate();
  };

  return {
    feedSources,
    isSourcesLoading,
    fetchArticlesQuery,
    isRefreshing,
    refreshFeed,
  };
};
