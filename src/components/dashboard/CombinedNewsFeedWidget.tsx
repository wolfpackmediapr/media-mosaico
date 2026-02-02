import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsCards, type NewsCard } from "@/components/ui/news-cards";
import { Input } from "@/components/ui/input";
import { 
  useCombinedNewsFeed, 
  useClientsForFilter,
  type SourceTypeFilter, 
  type SentimentFilter,
  type CombinedFeedFilters,
  type ExtendedNewsCard 
} from "@/hooks/use-combined-news-feed";
import { ChevronLeft, ChevronRight, Newspaper, Share2, RefreshCw, Filter, Smile, Frown, Meh, HelpCircle, Users, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface CombinedNewsFeedWidgetProps {
  className?: string;
}

const sentimentConfig = {
  positive: { label: 'Positivo', icon: Smile, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  negative: { label: 'Negativo', icon: Frown, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  neutral: { label: 'Neutral', icon: Meh, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  mixed: { label: 'Mixto', icon: HelpCircle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
};

export function CombinedNewsFeedWidget({ className }: CombinedNewsFeedWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<CombinedFeedFilters>({
    sourceType: 'all',
    sentiment: 'all',
    clientId: null,
    searchTerm: ''
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Update filters when debounced search term changes
  React.useEffect(() => {
    setFilters(prev => ({ ...prev, searchTerm: debouncedSearchTerm }));
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  
  const { data, isLoading, isRefetching, refetch } = useCombinedNewsFeed(currentPage, filters);
  const { data: clients } = useClientsForFilter();
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

  const handleFilterChange = (key: keyof CombinedFeedFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({ sourceType: 'all', sentiment: 'all', clientId: null, searchTerm: '' });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const hasActiveFilters = filters.sourceType !== 'all' || filters.sentiment !== 'all' || filters.clientId !== null;
  const hasSearchTerm = searchTerm.length > 0;

  const statusBars = [
    { id: "1", category: "Prensa Digital", subcategory: `${data?.prensaCount || 0}`, length: 3, opacity: 1 },
    { id: "2", category: "Redes Sociales", subcategory: `${data?.socialCount || 0}`, length: 2, opacity: 0.7 },
    { id: "3", category: "Total", subcategory: `${data?.totalCount || 0}`, length: 1, opacity: 0.4 }
  ];

  // Convert ExtendedNewsCard to NewsCard for the NewsCards component
  const newsCardsData = data?.items.map(item => ({
    ...item,
    // Add sentiment and client info to the content
    content: item.content ? [
      ...item.content,
      item.matchedClients && item.matchedClients.length > 0 
        ? `Clientes relacionados: ${item.matchedClients.map(c => c.name).join(', ')}`
        : ''
    ].filter(Boolean) : undefined
  })) || [];

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
          
          {/* Search Input */}
          <div className="flex-1 max-w-xs mx-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar noticias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 pr-8 text-sm"
              />
              {hasSearchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                  onClick={clearSearch}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasActiveFilters ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 relative"
                >
                  <Filter className="w-4 h-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center">
                      !
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtros</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                        Limpiar
                      </Button>
                    )}
                  </div>
                  
                  {/* Source Type Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Tipo de Fuente</label>
                    <Select
                      value={filters.sourceType}
                      onValueChange={(value: SourceTypeFilter) => handleFilterChange('sourceType', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="prensa">Prensa Digital</SelectItem>
                        <SelectItem value="social">Redes Sociales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sentiment Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Sentimiento</label>
                    <Select
                      value={filters.sentiment}
                      onValueChange={(value: SentimentFilter) => handleFilterChange('sentiment', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="positive">
                          <span className="flex items-center gap-2">
                            <Smile className="w-4 h-4 text-green-500" />
                            Positivo
                          </span>
                        </SelectItem>
                        <SelectItem value="negative">
                          <span className="flex items-center gap-2">
                            <Frown className="w-4 h-4 text-red-500" />
                            Negativo
                          </span>
                        </SelectItem>
                        <SelectItem value="neutral">
                          <span className="flex items-center gap-2">
                            <Meh className="w-4 h-4 text-muted-foreground" />
                            Neutral
                          </span>
                        </SelectItem>
                        <SelectItem value="mixed">
                          <span className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            Mixto
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                    <Select
                      value={filters.clientId || 'all'}
                      onValueChange={(value) => handleFilterChange('clientId', value === 'all' ? null : value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {clients?.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sentiment Stats */}
                  {data?.sentimentCounts && (
                    <div className="pt-2 border-t">
                      <label className="text-xs font-medium text-muted-foreground">Distribución de Sentimiento</label>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs flex items-center gap-1 bg-green-500/10">
                          <Smile className="w-3 h-3 text-green-500" />
                          {data.sentimentCounts.positive}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1 bg-red-500/10">
                          <Frown className="w-3 h-3 text-red-500" />
                          {data.sentimentCounts.negative}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Meh className="w-3 h-3" />
                          {data.sentimentCounts.neutral}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1 bg-amber-500/10">
                          <HelpCircle className="w-3 h-3 text-amber-500" />
                          {data.sentimentCounts.mixed}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

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

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {filters.sourceType !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {filters.sourceType === 'prensa' ? 'Prensa Digital' : 'Redes Sociales'}
              </Badge>
            )}
            {filters.sentiment !== 'all' && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                {(() => {
                  const config = sentimentConfig[filters.sentiment as keyof typeof sentimentConfig];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={cn("w-3 h-3", config.color)} />
                      {config.label}
                    </>
                  );
                })()}
              </Badge>
            )}
            {filters.clientId && clients && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                {clients.find(c => c.id === filters.clientId)?.name || 'Cliente'}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data?.items && data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((item) => (
              <NewsCardWithSentiment 
                key={item.id} 
                card={item} 
                onClick={handleCardClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay noticias disponibles</p>
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom news card component with sentiment and client display
function NewsCardWithSentiment({ 
  card, 
  onClick 
}: { 
  card: ExtendedNewsCard; 
  onClick: (card: NewsCard) => void;
}) {
  const sentimentInfo = card.sentiment ? sentimentConfig[card.sentiment as keyof typeof sentimentConfig] : null;
  const SentimentIcon = sentimentInfo?.icon;

  return (
    <div 
      className="group cursor-pointer rounded-xl bg-card border border-border overflow-hidden hover:shadow-lg transition-shadow"
      onClick={() => onClick(card)}
    >
      <div className="flex gap-4 p-3">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={card.image}
            alt={card.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop';
            }}
          />
          {card.gradientColors && (
            <div className={cn("absolute inset-0 bg-gradient-to-br", ...card.gradientColors)} />
          )}
          
          {/* Sentiment Badge on Image */}
          {sentimentInfo && SentimentIcon && (
            <div className={cn(
              "absolute top-1 left-1 p-1 rounded-full backdrop-blur-sm",
              sentimentInfo.bgColor
            )}>
              <SentimentIcon className={cn("w-3 h-3", sentimentInfo.color)} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="font-medium text-primary">{card.category}</span>
            <span>•</span>
            <span>{card.subcategory}</span>
            {sentimentInfo && (
              <>
                <span>•</span>
                <span className={cn("flex items-center gap-1", sentimentInfo.color)}>
                  {SentimentIcon && <SentimentIcon className="w-3 h-3" />}
                  {sentimentInfo.label}
                </span>
              </>
            )}
          </div>
          <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {card.title}
          </h4>
          
          {/* Matched Clients */}
          {card.matchedClients && card.matchedClients.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.matchedClients.slice(0, 3).map((client) => (
                <Badge 
                  key={client.id} 
                  variant="outline" 
                  className={cn(
                    "text-[10px] py-0 px-1.5",
                    client.relevance === 'alta' && "border-green-500/50 bg-green-500/10",
                    client.relevance === 'media' && "border-amber-500/50 bg-amber-500/10",
                    client.relevance === 'baja' && "border-muted"
                  )}
                >
                  {client.name}
                </Badge>
              ))}
              {card.matchedClients.length > 3 && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  +{card.matchedClients.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{card.timeAgo}</span>
            <span>•</span>
            <span>{card.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CombinedNewsFeedWidget;
