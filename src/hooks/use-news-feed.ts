
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
        const sourcesData = await fetchNewsSourcesFromDatabase();
        return transformSourcesToFeedSources(sourcesData);
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
          const { articlesData, count } = await fetchArticlesFromDatabase(page, searchTerm);
          
          if (!articlesData || articlesData.length === 0) {
            console.log('No articles found, setting empty array');
            return { articles: [], totalCount: 0 };
          }
          
          const convertedArticles = transformDatabaseArticlesToNewsArticles(articlesData);
          
          console.log('Processed articles:', convertedArticles);
          return { 
            articles: convertedArticles, 
            totalCount: count || 0
          };
        } catch (error) {
          handleNewsFeedError(error, "articles", toast);
          return { articles: [], totalCount: 0 };
        }
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      keepPreviousData: true,
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
