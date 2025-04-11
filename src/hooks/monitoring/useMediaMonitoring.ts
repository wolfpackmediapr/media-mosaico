
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  createMonitoringTarget, 
  getMonitoringTargets, 
  runMonitoringScan, 
  getMonitoringSummary,
  analyzeContentForTarget
} from "@/services/monitoring/mediaMonitoringService";

export function useMediaMonitoring() {
  const queryClient = useQueryClient();
  const [isRunningMonitoring, setIsRunningMonitoring] = useState(false);
  
  // Query to get all monitoring targets
  const { 
    data: monitoringTargets = [],
    isLoading: isLoadingTargets,
    refetch: refetchTargets
  } = useQuery({
    queryKey: ["monitoring-targets"],
    queryFn: getMonitoringTargets,
  });

  // Query to get monitoring summary
  const { 
    data: monitoringSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ["monitoring-summary"],
    queryFn: () => getMonitoringSummary(),
  });
  
  // Mutation to create a new monitoring target
  const { 
    mutateAsync: createTarget,
    isPending: isCreatingTarget
  } = useMutation({
    mutationFn: createMonitoringTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-targets"] });
      toast.success("Objetivo de monitoreo creado con éxito");
    },
    onError: (error) => {
      console.error("Error creating monitoring target:", error);
      toast.error("Error al crear objetivo de monitoreo");
    }
  });

  // Mutation to run a monitoring scan
  const { 
    mutateAsync: runScan,
    isPending: isRunningScanning
  } = useMutation({
    mutationFn: runMonitoringScan,
    onMutate: () => {
      setIsRunningMonitoring(true);
      toast.info("Iniciando análisis de monitoreo");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-summary"] });
      toast.success(`Monitoreo completado: ${data.matches} coincidencias encontradas`);
    },
    onError: (error) => {
      console.error("Error running monitoring scan:", error);
      toast.error("Error al ejecutar escaneo de monitoreo");
    },
    onSettled: () => {
      setIsRunningMonitoring(false);
    }
  });

  // Mutation to analyze specific content for a target
  const { 
    mutateAsync: analyzeContent,
    isPending: isAnalyzingContent
  } = useMutation({
    mutationFn: ({contentId, contentType, title, content, targetId}: {
      contentId: string;
      contentType: "news" | "social" | "radio" | "tv" | "press";
      title: string;
      content: string;
      targetId: string;
    }) => analyzeContentForTarget(contentId, contentType, title, content, targetId),
    onSuccess: (result) => {
      if (result.matched) {
        toast.success(`Análisis completado: ${result.matchedKeywords.length} palabras clave coincidentes`);
      } else {
        toast.info("No se encontraron coincidencias");
      }
    },
    onError: (error) => {
      console.error("Error analyzing content:", error);
      toast.error("Error al analizar contenido");
    }
  });
  
  return {
    // Data
    monitoringTargets,
    monitoringSummary,
    
    // Loading states
    isLoadingTargets,
    isLoadingSummary,
    isCreatingTarget,
    isRunningMonitoring: isRunningMonitoring || isRunningScanning,
    isAnalyzingContent,
    
    // Actions
    createTarget,
    runScan,
    analyzeContent,
    refetchTargets,
    refetchSummary
  };
}
