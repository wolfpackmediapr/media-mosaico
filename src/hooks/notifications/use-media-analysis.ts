
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { analyzeAndNotify, processContentItem } from "@/services/notifications/contentNotificationService";
import { useToast } from "@/hooks/use-toast";

interface UseMediaAnalysisOptions {
  onAnalysisComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export function useMediaAnalysis(options: UseMediaAnalysisOptions = {}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const analyzeContent = useCallback(async (
    contentId: string,
    contentType: "news" | "social" | "radio" | "tv" | "press",
    title: string,
    content: string
  ) => {
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeAndNotify(contentId, contentType, title, content);
      
      setAnalysisResult(result.analysis);
      
      // Show success notification
      toast({
        title: "Análisis completado",
        description: `Se encontraron ${result.analysis.matched_clients?.length || 0} clientes relevantes.`,
      });
      
      // Refresh notifications data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (options.onAnalysisComplete) {
        options.onAnalysisComplete(result.analysis);
      }
      
      return result.analysis;
    } catch (error) {
      console.error("Error analyzing content:", error);
      
      // Show error notification
      toast({
        title: "Error en el análisis",
        description: "No se pudo completar el análisis del contenido.",
        variant: "destructive"
      });
      
      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
      
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [queryClient, toast, options]);
  
  const triggerContentProcessing = useCallback(async (contentId: string, contentType: string) => {
    setIsAnalyzing(true);
    
    try {
      const result = await processContentItem(contentId, contentType);
      
      // Show success notification
      toast({
        title: "Contenido procesado",
        description: `Se procesó el contenido y se generaron ${result.notifications_count || 0} notificaciones.`,
      });
      
      // Refresh notifications data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      return result;
    } catch (error) {
      console.error("Error processing content:", error);
      
      // Show error notification
      toast({
        title: "Error en el procesamiento",
        description: "No se pudo procesar el contenido para generar notificaciones.",
        variant: "destructive"
      });
      
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [queryClient, toast]);
  
  return {
    analyzeContent,
    triggerContentProcessing,
    isAnalyzing,
    analysisResult
  };
}
