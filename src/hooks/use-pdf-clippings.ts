
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { PressClipping } from "@/types/pdf-processing";

export const usePdfClippings = () => {
  const { toast } = useToast();
  const [clippings, setClippings] = useState<PressClipping[]>([]);
  const [publicationName, setPublicationName] = useState("");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);

  const resetClippings = useCallback(() => {
    setClippings([]);
    setPublicationName("");
    setProcessingError(null);
    setProcessingComplete(false);
  }, []);

  const handleProcessingSuccess = useCallback((newClippings: PressClipping[], publication: string) => {
    setClippings(newClippings);
    setPublicationName(publication);
    setProcessingComplete(true);
    setProcessingError(null);
    
    toast({
      title: "PDF procesado exitosamente",
      description: `Se encontraron ${newClippings.length} recortes de prensa`,
    });
  }, [toast]);

  const handleProcessingError = useCallback((error: string) => {
    setProcessingError(error);
    setProcessingComplete(true);
    
    toast({
      title: "Error al procesar el PDF",
      description: error || "No se pudo procesar el archivo PDF",
      variant: "destructive"
    });
  }, [toast]);

  return {
    clippings,
    setClippings,
    publicationName,
    setPublicationName,
    processingError,
    setProcessingError,
    processingComplete,
    setProcessingComplete,
    resetClippings,
    handleProcessingSuccess,
    handleProcessingError
  };
};
