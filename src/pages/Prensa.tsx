
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PrensaHeader from "@/components/prensa/PrensaHeader";
import PrensaSearch from "@/components/prensa/PrensaSearch";
import PrensaEmptyState from "@/components/prensa/PrensaEmptyState";
import NewsArticleCard from "@/components/prensa/NewsArticleCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
}

const Prensa = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchArticles = async () => {
    try {
      console.log('Fetching articles...');
      setIsLoading(true);
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('pub_date', { ascending: false });

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
      
      const response = await supabase.functions.invoke('process-rss-feed', {
        body: {},
      });

      if (response.error) throw response.error;
      
      toast({
        title: "¡Éxito!",
        description: "Feed de noticias actualizado correctamente",
      });

      await fetchArticles();
    } catch (error) {
      console.error('Error refreshing feed:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el feed de noticias",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.clients.some(client => client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="grid gap-6">
          {filteredArticles.map((article) => (
            <NewsArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Prensa;
