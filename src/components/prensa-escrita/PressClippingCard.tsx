
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Tag, Users } from "lucide-react";

interface PressClippingCardProps {
  id: string;
  title: string;
  content: string;
  category: string;
  pageNumber: number;
  keywords?: string[];
  clientRelevance?: string[];
  publicationName?: string;
  similarity?: number;
}

const PressClippingCard = ({
  title,
  content,
  category,
  pageNumber,
  keywords,
  clientRelevance,
  publicationName,
  similarity
}: PressClippingCardProps) => {
  const getCategoryColor = () => {
    switch (category.toLowerCase()) {
      case 'política':
        return 'bg-blue-500 text-white';
      case 'economía':
        return 'bg-green-500 text-white';
      case 'deportes':
        return 'bg-orange-500 text-white';
      case 'cultura':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={getCategoryColor()}>
            {category}
          </Badge>
          <Badge variant="outline">
            Página {pageNumber}
          </Badge>
        </div>
        <CardTitle className="text-xl mt-2 line-clamp-2">{title}</CardTitle>
        {publicationName && (
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{publicationName}</span>
            {similarity !== undefined && (
              <Badge variant="secondary" className="ml-2">
                Similitud: {(similarity * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3">{content}</p>
        
        {clientRelevance && clientRelevance.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground mr-1">Clientes:</span>
            {clientRelevance.map((client, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {client}
              </Badge>
            ))}
          </div>
        )}
        
        {keywords && keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground mr-1">Keywords:</span>
            {keywords.map((keyword, index) => (
              <span key={index} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PressClippingCard;
