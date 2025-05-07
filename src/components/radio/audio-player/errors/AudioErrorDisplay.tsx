
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AudioErrorDisplayProps {
  error: string | null;
  file?: File;
  onSwitchToNative?: () => void;
}

export const AudioErrorDisplay: React.FC<AudioErrorDisplayProps> = ({
  error,
  file,
  onSwitchToNative
}) => {
  if (!error) return null;

  const isFormatError = error.toLowerCase().includes('format') || 
                        error.toLowerCase().includes('codec') ||
                        error.toLowerCase().includes('unsupported');

  const handleSwitchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSwitchToNative) {
      console.log('[AudioErrorDisplay] Switching to native audio player');
      onSwitchToNative();
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error de reproducción</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">{isFormatError 
          ? 'El archivo de audio tiene un formato no compatible con este reproductor.' 
          : 'Ha ocurrido un error al reproducir el audio.'
        }</p>
        
        {isFormatError && onSwitchToNative && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2" 
            onClick={handleSwitchClick}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Cambiar a reproductor nativo
          </Button>
        )}
        
        <div className="text-xs mt-2 opacity-70">
          {file && (
            <span>
              Archivo: {file.name} ({Math.round(file.size / 1024)}KB)
            </span>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
