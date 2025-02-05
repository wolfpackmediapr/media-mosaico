
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

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

interface NewsArticleCardProps {
  article: NewsArticle;
}

const NewsArticleCard = ({ article }: NewsArticleCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/4 h-48 md:h-auto">
          <img
            src={article.image_url || "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"}
            alt={article.title}
            className={`w-full h-full object-cover ${!article.image_url ? 'opacity-50' : ''}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b';
            }}
          />
        </div>
        <div className="md:w-3/4 p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-xl group">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline inline-flex items-center gap-2"
                  >
                    {article.title}
                    <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </CardTitle>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="font-medium">{article.source}</span>
                  <span>•</span>
                  <span>{format(new Date(article.pub_date), 'PPpp', { locale: es })}</span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 whitespace-nowrap">
                {article.category}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
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
            <div className="pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                asChild
              >
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver artículo original
                </a>
              </Button>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
};

export default NewsArticleCard;
