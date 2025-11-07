import { useState, useCallback } from "react";
import { PressClipping } from "./types";
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "./constants";
import { showSuccessToast, showErrorToast } from "./errors";

export const usePdfClippings = () => {
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
    
    showSuccessToast(
      SUCCESS_MESSAGES.PDF_PROCESSED,
      `Se encontraron ${newClippings.length} recortes de prensa`
    );
  }, []);

  const handleProcessingError = useCallback((error: string) => {
    setProcessingError(error);
    setProcessingComplete(true);
    
    showErrorToast(
      "Error al procesar el PDF",
      error || ERROR_MESSAGES.PROCESSING_ERROR
    );
  }, []);

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
