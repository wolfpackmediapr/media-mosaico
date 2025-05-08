
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AudioErrorDisplayProps {
  error: string;
  file?: File;
  onSwitchToNative?: () => void;
  onRetryUrl?: () => Promise<boolean>;
}

export const AudioErrorDisplay = ({ 
  error,
  file,
  onSwitchToNative,
  onRetryUrl
}: AudioErrorDisplayProps) => {
  // Simplify the error message for display
  const simplifyErrorMessage = (msg: string): string => {
    if (msg.includes('createObjectURL') || msg.includes('Overload resolution failed')) {
      return "URL creation failed. Trying to fix...";
    } else if (msg.includes('split')) {
      return "Error processing audio file name. Trying to fix...";
    } else if (msg.length > 100) {
      return msg.substring(0, 100) + '...';
    }
    return msg;
  };
  
  // Handle retry button click
  const handleRetry = async () => {
    // Try storage URL first if available
    if (onSwitchToNative) {
      console.log('[AudioErrorDisplay] Switching to native audio playback');
      onSwitchToNative();
    }
    
    // Fall back to retrying URL if switch didn't work
    if (onRetryUrl) {
      console.log('[AudioErrorDisplay] Retrying with URL validation');
      await onRetryUrl();
    }
  };
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Audio playback error</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{simplifyErrorMessage(error)}</p>
        
        {file && (
          <p className="text-sm opacity-80">
            File: {file.name || 'Unknown file'}
          </p>
        )}
        
        {(onSwitchToNative || onRetryUrl) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRetry}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try to fix
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
