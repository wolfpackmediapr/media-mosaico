import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Newspaper, Radio, FileText, Bell, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function QuickActions() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-rss-feed');
      
      if (error) throw error;
      
      toast.success('Feeds actualizados correctamente', {
        description: `Se procesaron ${data?.articlesProcessed || 0} artículos`
      });
    } catch (error) {
      console.error('Error refreshing feeds:', error);
      toast.error('Error al actualizar feeds', {
        description: 'Intente nuevamente más tarde'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4 gap-2"
            onClick={handleRefreshFeeds}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs">Actualizar Feeds</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate('/publiteca/prensa')}
          >
            <Newspaper className="h-5 w-5" />
            <span className="text-xs">Prensa Digital</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate('/radio')}
          >
            <Radio className="h-5 w-5" />
            <span className="text-xs">Radio</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate('/prensa-escrita')}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Prensa Escrita</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate('/clientes')}
          >
            <Bell className="h-5 w-5" />
            <span className="text-xs">Alertas</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col h-auto py-4 gap-2"
            onClick={() => navigate('/configuracion')}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Configuración</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
