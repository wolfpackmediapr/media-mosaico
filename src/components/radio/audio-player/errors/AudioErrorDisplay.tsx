
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioErrorDisplayProps {
  error: string | null;
  file?: File | null;
  className?: string;
  onTryNativePlayer?: () => void;
}

export function AudioErrorDisplay({ 
  error, 
  file, 
  className = '',
  onTryNativePlayer 
}: AudioErrorDisplayProps) {
  if (!error) return null;
  
  // Determine if this is a codec/format issue
  const isCodecError = error.includes('codec') || error.includes('format') || error.includes('NotSupported');
  
  // Extract useful information from error message
  const formatErrorMessage = (error: string): string => {
    // Handle common audio playback errors with user-friendly messages
    if (error.includes('AbortError')) {
      return 'La reproducción fue interrumpida. Intenta de nuevo.';
    }
    
    if (error.includes('NotSupportedError') || error.includes('format') || error.includes('codec')) {
      return 'El formato de audio no es compatible con el reproductor avanzado.';
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
      <AlertDescription>
        <div className="text-xs space-y-2">
          <div>{formatErrorMessage(error)}</div>
          
          {file && (
            <div className="mt-1 opacity-75">
              Archivo: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
          
          {isCodecError && onTryNativePlayer && (
            <div className="mt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-background hover:bg-background/90"
                onClick={onTryNativePlayer}
              >
                Intentar con reproductor nativo
              </Button>
              <p className="text-xs mt-1 opacity-70">
                El reproductor nativo de HTML5 puede ser compatible con este formato de audio.
              </p>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
