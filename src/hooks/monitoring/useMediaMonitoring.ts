import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  createMonitoringTarget, 
  getMonitoringTargets, 
  runMonitoringScan, 
  getMonitoringSummary,
  analyzeContentForTarget,
  deleteMonitoringTarget,
  updateMonitoringTarget,
  getAvailableCategories,
  getAvailableClients
} from "@/services/monitoring/mediaMonitoringService";

// Define proper types for monitoring data
export interface MonitoringTarget {
  id: string;
  name: string;
  type: 'client' | 'topic' | 'brand';
  keywords?: string[];
  categories?: string[];
  importance?: number;
  client_id?: string;
  clientName?: string;
  created_at: string;
  updated_at: string;
}

export interface MonitoringSummary {
  totalMentions: number;
  mentionsBySource: Record<string, number>;
  mentionsByDay: { date: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
  clientImpact?: { clientId: string; clientName: string; mentionCount: number }[];
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ClientOption {
  id: string;
  name: string;
  keywords?: string[];
}

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
  
  // Query to get available categories
  const {
    data: categories = [],
    isLoading: isLoadingCategories
  } = useQuery({
    queryKey: ["monitoring-categories"],
    queryFn: getAvailableCategories,
  });
  
  // Query to get available clients
  const {
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery({
    queryKey: ["monitoring-clients"],
    queryFn: getAvailableClients,
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
  
  // Mutation to update a monitoring target
  const {
    mutateAsync: updateTarget,
    isPending: isUpdatingTarget
  } = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<MonitoringTarget> }) =>
      updateMonitoringTarget(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-targets"] });
      toast.success("Objetivo de monitoreo actualizado con éxito");
    },
    onError: (error) => {
      console.error("Error updating monitoring target:", error);
      toast.error("Error al actualizar objetivo de monitoreo");
    }
  });
  
  // Mutation to delete a monitoring target
  const {
    mutateAsync: deleteTarget,
    isPending: isDeletingTarget
  } = useMutation({
    mutationFn: deleteMonitoringTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-targets"] });
      toast.success("Objetivo de monitoreo eliminado con éxito");
    },
    onError: (error) => {
      console.error("Error deleting monitoring target:", error);
      toast.error("Error al eliminar objetivo de monitoreo");
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
    categories,
    clients,
    
    // Loading states
    isLoadingTargets,
    isLoadingSummary,
    isLoadingCategories,
    isLoadingClients,
    isCreatingTarget,
    isUpdatingTarget,
    isDeletingTarget,
    isRunningMonitoring: isRunningMonitoring || isRunningScanning,
    isAnalyzingContent,
    
    // Actions
    createTarget,
    updateTarget,
    deleteTarget,
    runScan,
    analyzeContent,
    refetchTargets,
    refetchSummary
  };
}
