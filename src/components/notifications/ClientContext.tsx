
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Settings, Bell, BarChart } from "lucide-react";
import { formatDate } from "@/services/clients/clientService";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface ClientContextProps {
  client: {
    id: string;
    name: string;
    category: string;
    subcategory?: string | null;
    keywords?: string[] | null;
    created_at?: string;
  } | null;
  isLoading: boolean;
  onCreatePreference?: () => void;
  onTestNotifications?: () => void;
}

const ClientContext = ({
  client,
  isLoading,
  onCreatePreference,
  onTestNotifications,
}: ClientContextProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-9 w-full sm:w-40" />
              <Skeleton className="h-9 w-full sm:w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{client.name}</CardTitle>
            <CardDescription>
              {client.category}
              {client.subcategory ? ` • ${client.subcategory}` : ""}
              {client.created_at ? ` • Cliente desde ${formatDate(client.created_at)}` : ""}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/ajustes/clientes?client=${client.id}`)}
            title="Editar cliente"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2 flex items-center">
              <Tag className="h-4 w-4 mr-1" />
              <span>Keywords para monitoreo</span>
            </div>
            {client.keywords && client.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {client.keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin keywords definidos</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={onCreatePreference}
            >
              <Bell className="h-4 w-4" />
              Configurar notificaciones
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={onTestNotifications}
            >
              <BarChart className="h-4 w-4" />
              Analizar relevancia
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientContext;
