
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AudioErrorDisplayProps {
  error: string | null;
  file?: File | null;
  className?: string;
}

export function AudioErrorDisplay({ error, file, className = '' }: AudioErrorDisplayProps) {
  if (!error) return null;
  
  // Extract useful information from error message
  const formatErrorMessage = (error: string): string => {
    // Handle common audio playback errors with user-friendly messages
    if (error.includes('AbortError')) {
      return 'La reproducción fue interrumpida. Intenta de nuevo.';
    }
    
    if (error.includes('NotSupportedError') || error.includes('format')) {
      return 'El formato de audio no es compatible con este navegador.';
    }
    
    if (error.includes('NotAllowedError') || error.includes('permission')) {
      return 'No hay permiso para reproducir audio. Verifica la configuración de tu navegador.';
    }
    
    // Return simplified message for other errors
    return 'No se puede reproducir el archivo de audio.';
  };
  
  return (
    <Alert variant="destructive" className={`mb-4 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error reproduciendo audio</AlertTitle>
      <AlertDescription className="text-xs">
        {formatErrorMessage(error)}
        {file && (
          <div className="mt-1 opacity-75">
            Archivo: {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
