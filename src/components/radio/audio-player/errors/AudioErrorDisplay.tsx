
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AudioErrorDisplayProps {
  error: string;
  file: File;
  onSwitchToNative?: () => void;
  onRetryUrl?: () => Promise<boolean>;
  onTryStorageUrl?: () => Promise<boolean>;
}

export const AudioErrorDisplay = ({ 
  error, 
  file,
  onSwitchToNative,
  onRetryUrl,
  onTryStorageUrl
}: AudioErrorDisplayProps) => {
  const isBlobUrlError = error?.toLowerCase().includes('request range') || 
                        error?.includes('ERR_REQUEST_RANGE_NOT_SATISFIABLE');
  
  const isNotAllowedError = error?.includes('NotAllowedError') || 
                           (error?.includes('play()') && error?.includes('user'));

  const handleRetryUrl = async () => {
    if (onRetryUrl) {
      try {
        const success = await onRetryUrl();
        if (success) {
          console.log('[AudioErrorDisplay] Successfully refreshed blob URL');
        } else {
          console.log('[AudioErrorDisplay] Failed to refresh blob URL, switching to native');
          if (onSwitchToNative) onSwitchToNative();
        }
      } catch (e) {
        console.error('[AudioErrorDisplay] Error retrying URL:', e);
        if (onSwitchToNative) onSwitchToNative();
      }
    }
  };
  
  const handleTryStorageUrl = async () => {
    if (onTryStorageUrl) {
      try {
        const success = await onTryStorageUrl();
        if (success) {
          console.log('[AudioErrorDisplay] Successfully switched to storage URL');
        } else {
          console.log('[AudioErrorDisplay] Failed to use storage URL, switching to native');
          if (onSwitchToNative) onSwitchToNative();
        }
      } catch (e) {
        console.error('[AudioErrorDisplay] Error using storage URL:', e);
        if (onSwitchToNative) onSwitchToNative();
      }
    }
  };
  
  // Check if the file has a storageUrl property (indicating it's from Supabase)
  const hasStorageUrl = (file as any).storageUrl || ((file as any).preview && !((file as any).preview as string).startsWith('blob:'));
  
  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-sm font-semibold">
        {isBlobUrlError 
          ? 'Error de reproducción (URL no válida)' 
          : isNotAllowedError 
            ? 'Error de reproducción (interacción requerida)' 
            : 'Error de reproducción'}
      </AlertTitle>
      <AlertDescription className="text-xs">
        {isBlobUrlError 
          ? 'La URL del audio ya no es válida. Esto puede ocurrir después de recargar la página.' 
          : isNotAllowedError
            ? 'El navegador requiere interacción del usuario antes de reproducir audio.'
            : (error || 'Error desconocido durante la reproducción')}
      </AlertDescription>
      
      <div className="flex gap-2 mt-2">
        {isBlobUrlError && onTryStorageUrl && hasStorageUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTryStorageUrl}
            className="text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Usar URL almacenada
          </Button>
        )}

        {isBlobUrlError && onRetryUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetryUrl}
            className="text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Actualizar URL
          </Button>
        )}
        
        {onSwitchToNative && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSwitchToNative}
            className="text-xs"
          >
            Usar reproductor nativo
          </Button>
        )}
      </div>
    </Alert>
  );
};
