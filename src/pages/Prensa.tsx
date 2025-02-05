
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Newspaper, Search, Filter, Download, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('pub_date', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Error",
        description: "Could not fetch news articles",
        variant: "destructive",
      });
    }
  };

  const refreshFeed = async () => {
    setIsLoading(true);
    try {
      const { user } = (await supabase.auth.getUser()).data;
      if (!user) throw new Error('Not authenticated');

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
      setIsLoading(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">BOT Prensa</h1>
        <p className="text-gray-500 mt-2">
          Monitoreo y análisis de contenido impreso y digital
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar en prensa..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="sm:w-auto"
          onClick={refreshFeed}
          disabled={isLoading}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
        <Button variant="outline" className="sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredArticles.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      {article.title}
                    </a>
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    {article.source} • {format(new Date(article.pub_date), 'PPpp')}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  {article.category}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{article.summary}</p>
              {article.clients.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Clientes Relevantes:</h4>
                  <div className="flex flex-wrap gap-2">
                    {article.clients.map((client, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
                      >
                        {client}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {article.keywords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Palabras Clave:</h4>
                  <div className="flex flex-wrap gap-2">
                    {article.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
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
    </div>
  );
};

export default Prensa;
