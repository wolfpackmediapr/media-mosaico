
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { NewsArticle, FeedSource } from "@/types/prensa";

const ITEMS_PER_PAGE = 10;

export const useNewsFeed = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchFeedSources = async () => {
    try {
      const { data: sourcesData, error } = await supabase
        .from('feed_sources')
        .select('id, name, url, active, last_successful_fetch, last_fetch_error, error_count')
        .order('name');

      if (error) throw error;
      
      const typedSources: FeedSource[] = sourcesData?.map(source => ({
        id: source.id,
        name: source.name,
        url: source.url,
        active: source.active,
        last_successful_fetch: source.last_successful_fetch,
        last_fetch_error: source.last_fetch_error,
        error_count: source.error_count
      })) || [];
      
      setFeedSources(typedSources);
    } catch (error) {
      console.error('Error fetching feed sources:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las fuentes de noticias",
        variant: "destructive",
      });
    }
  };

  const fetchArticles = async (page: number) => {
    try {
      console.log('Fetching articles for page:', page);
      setIsLoading(true);
      
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { count } = await supabase
        .from('news_articles')
        .select('*', { count: 'exact', head: true });

      setTotalCount(count || 0);

      const { data: articlesData, error } = await supabase
        .from('news_articles')
        .select(`
          *,
          feed_source:feed_source_id (
            name,
            last_successful_fetch
          )
        `)
        .order('pub_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      console.log('Fetched articles:', articlesData);

      const convertedArticles: NewsArticle[] = (articlesData || []).map(article => ({
        ...article,
        clients: Array.isArray(article.clients) ? article.clients : 
                typeof article.clients === 'string' ? [article.clients] : 
                article.clients ? (article.clients as any) : []
      }));

      setArticles(convertedArticles);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los artículos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeed = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing feed...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Error al verificar la sesión');
      }
      
      if (!session) {
        toast({
          title: "Error de autenticación",
          description: "Debe iniciar sesión para actualizar el feed",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-rss-feed', {
        body: { timestamp: new Date().toISOString() }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }
      
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
      console.error('Error refreshing feed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el feed de noticias",
        variant: "destructive",
      });
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
