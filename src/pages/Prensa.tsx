
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Newspaper, Search, Filter, Download, RefreshCcw, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

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

      // Convert the data to match NewsArticle interface
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
        description: "Could not fetch news articles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeed = async () => {
    setIsRefreshing(true);
    try {
      const { user } = (await supabase.auth.getUser()).data;
      if (!user) throw new Error('Not authenticated');

      console.log('Refreshing feed for user:', user.id);

      const response = await supabase.functions.invoke('process-rss-feed', {
        body: { user_id: user.id },
      });

      if (response.error) throw response.error;
      
      toast({
        title: "Success",
        description: "News feed refreshed successfully",
      });

      await fetchArticles();
    } catch (error) {
      console.error('Error refreshing feed:', error);
      toast({
        title: "Error",
        description: "Could not refresh news feed",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="h-8 w-8 text-blue-600" />
            BOT Prensa
          </h1>
          <p className="text-gray-500 mt-2">
            Monitoreo y análisis de contenido impreso y digital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={refreshFeed}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Filtrar por fecha
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por título, categoría, cliente o palabra clave..."
          className="pl-10 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No hay artículos disponibles</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm 
              ? "No se encontraron artículos que coincidan con tu búsqueda."
              : "Haz clic en \"Actualizar\" para cargar nuevos artículos."}
          </p>
          {searchTerm && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchTerm("")}
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                      >
                        {article.title}
                      </a>
                    </CardTitle>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="font-medium">{article.source}</span>
                      <span>•</span>
                      <span>{format(new Date(article.pub_date), 'PPpp')}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 whitespace-nowrap">
                    {article.category}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 leading-relaxed">{article.summary}</p>
                {article.clients.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-gray-700">Clientes Relevantes:</h4>
                    <div className="flex flex-wrap gap-2">
                      {article.clients.map((client, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                        >
                          {client}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {article.keywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-gray-700">Palabras Clave:</h4>
                    <div className="flex flex-wrap gap-2">
                      {article.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prensa;
