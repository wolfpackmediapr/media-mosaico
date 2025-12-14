import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsCards, type NewsCard } from "@/components/ui/news-cards";
import { useCombinedNewsFeed } from "@/hooks/use-combined-news-feed";
import { ChevronLeft, ChevronRight, Newspaper, Share2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

interface CombinedNewsFeedWidgetProps {
  className?: string;
}

export function CombinedNewsFeedWidget({ className }: CombinedNewsFeedWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isRefetching, refetch } = useCombinedNewsFeed(currentPage);
  const queryClient = useQueryClient();
  
  const totalPages = data ? Math.ceil(data.totalCount / 10) : 1;
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['combined-news-feed'] });
    refetch();
  };

  const handleCardClick = (card: NewsCard) => {
    if (card.link) {
      window.open(card.link, '_blank', 'noopener,noreferrer');
    }
  };

  const statusBars = [
    { id: "1", category: "Prensa Digital", subcategory: `${data?.prensaCount || 0}`, length: 3, opacity: 1 },
    { id: "2", category: "Redes Sociales", subcategory: `${data?.socialCount || 0}`, length: 2, opacity: 0.7 },
    { id: "3", category: "Total", subcategory: `${data?.totalCount || 0}`, length: 1, opacity: 0.4 }
  ];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl border border-border">
                <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Feed Unificado</CardTitle>
            <div className="flex gap-1.5">
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Newspaper className="w-3 h-3" />
                {data?.prensaCount || 0}
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                {data?.socialCount || 0}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2 min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data?.items && data.items.length > 0 ? (
          <NewsCards
            title=""
            subtitle=""
            statusBars={statusBars}
            newsCards={data.items}
            enableAnimations={true}
            onCardClick={handleCardClick}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay noticias disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CombinedNewsFeedWidget;
