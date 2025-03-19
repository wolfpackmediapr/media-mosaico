
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchFeedSources = async () => {
    try {
      const sourcesData = await fetchNewsSourcesFromDatabase();
      const typedSources = transformSourcesToFeedSources(sourcesData);
      setFeedSources(typedSources);
    } catch (error) {
      handleNewsFeedError(error, "sources", toast);
    }
  };

  const fetchArticles = async (page: number, searchTerm: string = '', sourceId: string = '') => {
    try {
      console.log('Fetching articles for page:', page, 'search:', searchTerm, 'sourceId:', sourceId);
      setIsLoading(true);
      
      const { articlesData, count } = await fetchArticlesFromDatabase(page, searchTerm, sourceId);
      
      if (!articlesData || articlesData.length === 0) {
        console.log('No articles found, setting empty array');
        setArticles([]);
        setTotalCount(0);
        return;
      }
      
      setTotalCount(count || 0);
      const convertedArticles = transformDatabaseArticlesToNewsArticles(articlesData);
      
      console.log('Processed articles:', convertedArticles);
      setArticles(convertedArticles);
    } catch (error) {
      handleNewsFeedError(error, "articles", toast);
      // Set empty articles in case of error
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeed = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing feed...');
      
      const data = await refreshNewsFeedViaFunction();
      console.log('Feed refresh response:', data);
      
      await Promise.all([
        fetchArticles(1), // Reset to first page after refresh
        fetchFeedSources()
      ]);

      toast({
        title: "¡Éxito!",
        description: "Feed de noticias actualizado correctamente",
      });
    } catch (error) {
      handleNewsFeedError(error, "refresh", toast);
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    articles,
    feedSources,
    isLoading,
    isRefreshing,
    totalCount,
    fetchArticles,
    fetchFeedSources,
    refreshFeed,
  };
};
