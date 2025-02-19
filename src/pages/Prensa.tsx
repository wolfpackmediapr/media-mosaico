
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PrensaHeader from "@/components/prensa/PrensaHeader";
import PrensaSearch from "@/components/prensa/PrensaSearch";
import PrensaEmptyState from "@/components/prensa/PrensaEmptyState";
import NewsArticleCard from "@/components/prensa/NewsArticleCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
}

const ITEMS_PER_PAGE = 10;

const Prensa = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

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

      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('pub_date', { ascending: false })
        .range(from, to);

      if (error) throw error;

      console.log('Fetched articles:', data);

      const convertedArticles: NewsArticle[] = (data || []).map(article => ({
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
      
      // Check authentication first
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

      // Use supabase.functions.invoke with error handling
      const { data, error } = await supabase.functions.invoke('process-rss-feed', {
        body: { timestamp: new Date().toISOString() }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }
      
      console.log('Feed refresh response:', data);
      
      toast({
        title: "¡Éxito!",
        description: "Feed de noticias actualizado correctamente",
      });

      await fetchArticles(currentPage);
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PrensaHeader onRefresh={refreshFeed} isRefreshing={isRefreshing} />
      
      <PrensaSearch 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
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
