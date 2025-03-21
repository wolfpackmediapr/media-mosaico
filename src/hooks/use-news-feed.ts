
import { useState, useCallback } from 'react';
import { 
  fetchNewsSourcesFromDatabase, 
  fetchArticlesFromDatabase, 
  refreshNewsFeedViaFunction 
} from '@/services/news/api';
import type { NewsArticle, FeedSource } from '@/types/prensa';
import { toast } from 'sonner';

export const useNewsFeed = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFeedSources = useCallback(async () => {
    try {
      const sources = await fetchNewsSourcesFromDatabase();
      setFeedSources(sources);
    } catch (error) {
      console.error('Error fetching feed sources', error);
      toast.error('Error al cargar las fuentes de noticias');
    }
  }, []);

  const fetchArticles = useCallback(async (
    page: number = 1, 
    searchTerm: string = '', 
    sourceId: string = '',
    dateFilter: string = ''
  ) => {
    setIsLoading(true);
    
    try {
      const { articlesData, count } = await fetchArticlesFromDatabase(
        page,
        searchTerm,
        sourceId,
        dateFilter
      );
      
      setArticles(articlesData || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching articles', error);
      toast.error('Error al cargar los artículos');
      setArticles([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      await refreshNewsFeedViaFunction();
      toast.success('Feed actualizado correctamente');
      
      // Refresh articles and sources
      await fetchArticles();
      await fetchFeedSources();
    } catch (error) {
      console.error('Error refreshing feed', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al actualizar el feed: ${errorMsg}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchArticles, fetchFeedSources]);

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
