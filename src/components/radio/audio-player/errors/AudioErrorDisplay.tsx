
import React from 'react';
import { AlertCircle, Headphones } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AudioErrorDisplayProps {
  error: string;
  file?: File;
  onSwitchToNative?: () => void;
}

/**
 * Component to display audio playback errors with helpful messages and recovery options
 */
export const AudioErrorDisplay: React.FC<AudioErrorDisplayProps> = ({ 
  error, 
  file,
  onSwitchToNative 
}) => {
  // Get file extension if available
  const fileExtension = file?.name?.split('.')?.pop()?.toUpperCase() || '';
  
  // Determine error category to provide more helpful messages
  const isFormatError = error.includes('format') || error.includes('codec') || 
                        error.includes('NotSupported') || error.includes('_id');
  const isNetworkError = error.includes('network') || error.includes('fetch') || 
                         error.includes('load');
  const isPermissionError = error.includes('permission') || error.includes('NotAllowed');
  
  // Determine appropriate error message
  let errorTitle = 'Error de reproducción';
  let errorMessage = 'Hubo un problema al reproducir este audio.';
  
  if (isFormatError) {
    errorTitle = 'Formato no compatible';
    errorMessage = `El navegador no puede reproducir este archivo ${fileExtension} con el reproductor avanzado.`;
  } else if (isNetworkError) {
    errorTitle = 'Error de carga';
    errorMessage = 'No se pudo cargar el archivo de audio.';
  } else if (isPermissionError) {
    errorTitle = 'Permiso denegado';
    errorMessage = 'El navegador no permite reproducir audio automáticamente.';
  } else if (error === '4') {
    errorTitle = 'Error de decodificación';
    errorMessage = 'No se pudo decodificar el audio. Cambiando al reproductor nativo.';
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{errorTitle}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{errorMessage}</p>
        {onSwitchToNative && (
          <Button 
            variant="outline"
            size="sm"
            onClick={onSwitchToNative}
            className="mt-2 flex items-center gap-1"
          >
            <Headphones className="h-3.5 w-3.5" />
            Usar reproductor nativo
          </Button>
        )}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs mt-2 opacity-80 font-mono">
            Error: {error}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
