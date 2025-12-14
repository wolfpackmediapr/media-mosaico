
import { ExternalLink, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { NewsArticle } from "@/types/prensa";
import { sanitizeSocialContent } from "@/services/social/content-sanitizer";

interface NewsArticleCardProps {
  article: NewsArticle;
}

const NewsArticleCard = ({ article }: NewsArticleCardProps) => {
  const pubDateFormatted = article.pub_date
    ? formatDistanceToNow(new Date(article.pub_date), { 
        addSuffix: true,
        locale: es
      })
    : "";
  
  // Use the sanitizer to clean up the description
  const sanitizedDescription = sanitizeSocialContent(article.description || '');
  
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {article.image_url && (
            <div className="md:w-1/4 h-48 md:h-auto flex-shrink-0">
              <img 
                src={article.image_url} 
                alt={article.title || "Article image"}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className={`${article.image_url ? 'md:w-3/4' : 'w-full'} p-6`}>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {article.source || (article.feed_source?.name || "")}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{pubDateFormatted}</span>
              
              {article.category && (
                <Badge variant="outline" className="ml-auto">
                  {article.category}
                </Badge>
              )}
            </div>
            
            <h3 className="font-bold text-xl mb-3">{article.title}</h3>
            
            {sanitizedDescription && (
              <div 
                className="text-muted-foreground mb-4 prose-sm max-w-none line-clamp-3"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            )}
            
            {article.clients && article.clients.length > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                <User className="h-3 w-3 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {article.clients.map((client, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs px-1.5 py-0 h-5 bg-primary/5 border-primary/20 text-primary"
                    >
                      {client}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <Button variant="outline" size="sm" asChild>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                Leer artículo completo
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsArticleCard;
