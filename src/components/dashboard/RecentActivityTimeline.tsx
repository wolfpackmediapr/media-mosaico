import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRecentActivity } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Newspaper, Radio, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RecentActivityTimeline() {
  const { data: activities, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>Últimos contenidos procesados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTypeIcon = (type: 'article' | 'radio' | 'press') => {
    switch (type) {
      case 'article':
        return <Newspaper className="h-4 w-4" />;
      case 'radio':
        return <Radio className="h-4 w-4" />;
      case 'press':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: 'article' | 'radio' | 'press') => {
    switch (type) {
      case 'article':
        return <Badge variant="outline" className="text-xs">Digital</Badge>;
      case 'radio':
        return <Badge variant="outline" className="text-xs bg-chart-2/10 border-chart-2/30">Radio</Badge>;
      case 'press':
        return <Badge variant="outline" className="text-xs bg-chart-3/10 border-chart-3/30">Prensa</Badge>;
    }
  };

  const getIconBackground = (type: 'article' | 'radio' | 'press') => {
    switch (type) {
      case 'article':
        return "bg-chart-1/10 text-chart-1";
      case 'radio':
        return "bg-chart-2/10 text-chart-2";
      case 'press':
        return "bg-chart-3/10 text-chart-3";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
        <CardDescription>Últimos contenidos procesados de todas las fuentes</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {activities?.map((activity, index) => (
                <div key={activity.id} className="relative flex items-start gap-4 pl-10">
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-0 p-2 rounded-full",
                    getIconBackground(activity.type)
                  )}>
                    {getTypeIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight line-clamp-2">
                          {activity.title}
                        </p>
                        {activity.source && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {activity.source}
                          </p>
                        )}
                      </div>
                      {getTypeBadge(activity.type)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(activity.timestamp), { 
                        addSuffix: true,
                        locale: es 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
