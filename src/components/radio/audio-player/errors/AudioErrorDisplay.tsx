
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, Headphones } from "lucide-react";
import { isValidFileForBlobUrl } from "@/utils/audio-url-validator";

interface AudioErrorDisplayProps {
  error: string;
  file: File;
  onSwitchToNative?: () => void;
  onRetryUrl?: () => Promise<boolean>;
}

export const AudioErrorDisplay: React.FC<AudioErrorDisplayProps> = ({
  error,
  file,
  onSwitchToNative,
  onRetryUrl
}) => {
  const [isRetrying, setIsRetrying] = React.useState(false);
  
  // Check if the file is valid for playback
  const isValidFile = isValidFileForBlobUrl(file);
  
  // Clean up the error message for display
  const errorMessage = React.useMemo(() => {
    if (typeof error !== 'string') return 'Error de reproducción';
    
    // Remove verbose parts and simplify
    let cleanError = error
      .replace(/Error loading audio:/i, '')
      .replace(/Error playing audio:/i, '')
      .replace(/Native audio error:/i, '')
      .replace(/Failed to play/i, '')
      .trim();
      
    // If it's still long, truncate it
    if (cleanError.length > 100) {
      cleanError = cleanError.substring(0, 97) + '...';
    }
    
    return cleanError || 'Error de reproducción de audio';
  }, [error]);
  
  // Determine if this error is format related
  const isFormatError = error.toLowerCase().includes('format') || 
                        error.toLowerCase().includes('codec') ||
                        error.toLowerCase().includes('playback');
                        
  // Determine suggestion based on error type
  const suggestionText = isFormatError 
    ? "Prueba cambiando al reproductor de audio nativo" 
    : "Intenta actualizar la URL del archivo";
  
  // Handle the retry action
  const handleRetry = async () => {
    if (!onRetryUrl) return;
    
    setIsRetrying(true);
    try {
      const success = await onRetryUrl();
      if (!success && onSwitchToNative) {
        // If URL validation fails, try switching to native
        onSwitchToNative();
      }
    } catch (error) {
      console.error("[AudioErrorDisplay] Error retrying URL validation:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  // If file is invalid, don't show any error (the invalid file alert will be shown instead)
  if (!isValidFile) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>Error de reproducción</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{errorMessage}</p>
        <p className="text-sm opacity-80">{suggestionText}</p>
        
        <div className="flex gap-2 mt-2">
          {onRetryUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
              Reintentar
            </Button>
          )}
          
          {isFormatError && onSwitchToNative && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSwitchToNative}
            >
              <Headphones className="w-4 h-4 mr-1" />
              Usar audio nativo
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
