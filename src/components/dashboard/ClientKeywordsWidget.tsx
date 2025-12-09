import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useClientKeywords } from "@/hooks/use-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ClientKeywordsWidget() {
  const { data: clients, isLoading } = useClientKeywords();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clientes Monitoreados
          </CardTitle>
          <CardDescription>Keywords activas</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Group clients by category
  const clientsByCategory = clients?.reduce((acc, client) => {
    const category = client.category || 'Sin categoría';
    if (!acc[category]) acc[category] = [];
    acc[category].push(client);
    return acc;
  }, {} as Record<string, typeof clients>);

  const totalKeywords = clients?.reduce((acc, client) => acc + (client.keywords?.length || 0), 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Clientes Monitoreados
        </CardTitle>
        <CardDescription>
          {clients?.length || 0} clientes • {totalKeywords} keywords activas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[220px] pr-4">
          <div className="space-y-4">
            {Object.entries(clientsByCategory || {}).map(([category, categoryClients]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {category}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryClients.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-5">
                  {categoryClients.map((client) => (
                    <Badge 
                      key={client.id} 
                      variant="outline"
                      className="text-xs"
                    >
                      {client.name}
                      {client.keywords?.length > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({client.keywords.length})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
