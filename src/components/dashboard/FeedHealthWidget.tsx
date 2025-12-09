import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFeedHealth } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Rss, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function FeedHealthWidget() {
  const { data: feeds, isLoading } = useFeedHealth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="h-5 w-5" />
            Estado de Feeds
          </CardTitle>
          <CardDescription>Monitoreo de fuentes RSS</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const activeFeeds = feeds?.filter(f => f.active) || [];
  const inactiveFeeds = feeds?.filter(f => !f.active) || [];
  const feedsWithErrors = feeds?.filter(f => f.errorCount > 0) || [];

  const getStatusIcon = (feed: typeof feeds[0]) => {
    if (!feed.active) return <XCircle className="h-4 w-4 text-muted-foreground" />;
    if (feed.errorCount > 0) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const getStatusBadge = (feed: typeof feeds[0]) => {
    if (!feed.active) {
      return <Badge variant="secondary">Inactivo</Badge>;
    }
    if (feed.errorCount > 0) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Errores: {feed.errorCount}</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-600">Activo</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="h-5 w-5" />
          Estado de Feeds
        </CardTitle>
        <CardDescription>
          {activeFeeds.length} activos • {feedsWithErrors.length} con errores • {inactiveFeeds.length} inactivos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[220px] pr-4">
          <div className="space-y-3">
            {feeds?.map((feed) => (
              <div 
                key={feed.id} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  !feed.active && "bg-muted/50",
                  feed.errorCount > 0 && feed.active && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getStatusIcon(feed)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{feed.name}</p>
                    {feed.lastSuccessfulFetch && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(feed.lastSuccessfulFetch), { 
                          addSuffix: true,
                          locale: es 
                        })}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(feed)}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
