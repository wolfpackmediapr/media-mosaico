
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { scheduleContentProcessing, processContentItem } from "@/services/notifications/contentNotificationService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const NotificationTestPanel = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleTriggerProcessing = async () => {
    setIsScheduling(true);
    try {
      const result = await scheduleContentProcessing();
      toast({
        title: "Procesamiento Programado",
        description: `Se ha programado el procesamiento de contenido nuevo.`,
      });
      console.log("Processing scheduled:", result);
    } catch (error) {
      console.error("Error scheduling processing:", error);
      toast({
        title: "Error",
        description: "No se pudo programar el procesamiento de contenido",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleProcessNews = async () => {
    setIsProcessing(true);
    try {
      // Get a news article to process
      const { data } = await fetch("/api/get-latest-news").then(res => res.json());
      if (!data || !data.id) {
        throw new Error("No news article found");
      }
      
      const result = await processContentItem(data.id, "news");
      toast({
        title: "Notificación Generada",
        description: `Se ha procesado un artículo de noticias para notificaciones.`,
      });
      console.log("Content processed:", result);
    } catch (error) {
      console.error("Error processing content:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar el contenido para notificaciones",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Panel de Pruebas de Notificaciones</CardTitle>
        <CardDescription>
          Utilice estas herramientas para probar el sistema de notificaciones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={handleTriggerProcessing}
            disabled={isScheduling}
            className="w-full"
          >
            {isScheduling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Programando...
              </>
            ) : (
              "Procesar Todo el Contenido Nuevo"
            )}
          </Button>
          
          <Button 
            onClick={handleProcessNews}
            disabled={isProcessing}
            variant="outline"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Simular Notificación de Noticias"
            )}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground mt-4">
          <p>
            Estas acciones procesarán contenido nuevo y generarán notificaciones basadas en las
            coincidencias de palabras clave y las preferencias configuradas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationTestPanel;
