
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PrensaHeader from "@/components/prensa/PrensaHeader";
import PrensaSearch from "@/components/prensa/PrensaSearch";
import PrensaEmptyState from "@/components/prensa/PrensaEmptyState";
import NewsArticleCard from "@/components/prensa/NewsArticleCard";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  pub_date: string;
  source: string;
  summary: string;
  category: string;
  clients: string[];
  keywords: string[];
  image_url?: string;
  last_processed?: string;
  feed_source?: {
    name: string;
    last_successful_fetch: string | null;
  };
}

interface FeedSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
  last_successful_fetch: string | null;
  last_fetch_error: string | null;
  error_count: number;
}

const ITEMS_PER_PAGE = 10;

const Prensa = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchFeedSources = async () => {
    try {
      const { data: sourcesData, error } = await supabase
        .from('feed_sources')
        .select('id, name, url, active, last_successful_fetch, last_fetch_error, error_count')
        .order('name');

      if (error) throw error;
      
      // Ensure type safety by explicitly casting the response
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
        fetchArticles(currentPage),
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

  useEffect(() => {
    fetchArticles(currentPage);
    fetchFeedSources();
  }, [currentPage]);

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.clients.some(client => client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderFeedStatus = () => {
    if (feedSources.length === 0) return null;

    return (
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {feedSources.map((source) => (
          <div
            key={source.id}
            className="bg-card rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-sm">{source.name}</h3>
              {source.error_count > 0 ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : source.last_successful_fetch ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {source.last_successful_fetch ? (
                <p>Última actualización: {new Date(source.last_successful_fetch).toLocaleString()}</p>
              ) : (
                <p>Sin actualizaciones recientes</p>
              )}
              {source.last_fetch_error && (
                <p className="text-destructive mt-1">Error: {source.last_fetch_error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PrensaHeader onRefresh={refreshFeed} isRefreshing={isRefreshing} />
      
      {renderFeedStatus()}

      <PrensaSearch 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[200px]" />
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <PrensaEmptyState 
          searchTerm={searchTerm}
          onClearSearch={() => setSearchTerm("")}
        />
      ) : (
        <>
          <div className="grid gap-6">
            {filteredArticles.map((article) => (
              <NewsArticleCard key={article.id} article={article} />
            ))}
          </div>

          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = i + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNumber)}
                      isActive={currentPage === pageNumber}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 5 && (
                <>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => handlePageChange(totalPages)}
                      isActive={currentPage === totalPages}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                </>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </div>
  );
};

export default Prensa;
