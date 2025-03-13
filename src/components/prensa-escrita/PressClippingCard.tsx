
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Tag, Users } from "lucide-react";

interface PressClippingSummary {
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
}

interface PressClippingCardProps {
  id: string;
  title: string;
  content: string;
  category: string;
  pageNumber: number;
  summary?: PressClippingSummary;
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
  summary,
  keywords,
  clientRelevance,
  publicationName,
  similarity
}: PressClippingCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent pb-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="bg-primary text-primary-foreground">
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
        <p className="text-sm text-gray-600 line-clamp-3">{content}</p>
        
        {summary && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Análisis 5W:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-muted rounded p-2">
                <span className="font-semibold">¿Quién?:</span> {summary.who}
              </div>
              <div className="bg-muted rounded p-2">
                <span className="font-semibold">¿Qué?:</span> {summary.what}
              </div>
              <div className="bg-muted rounded p-2">
                <span className="font-semibold">¿Cuándo?:</span> {summary.when}
              </div>
              <div className="bg-muted rounded p-2">
                <span className="font-semibold">¿Dónde?:</span> {summary.where}
              </div>
              <div className="bg-muted rounded p-2 md:col-span-2">
                <span className="font-semibold">¿Por qué?:</span> {summary.why}
              </div>
            </div>
          </div>
        )}
        
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
