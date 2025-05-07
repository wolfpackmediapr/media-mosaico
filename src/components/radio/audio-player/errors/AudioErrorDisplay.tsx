
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { getAudioFormatDetails } from '@/utils/audio-format-helper';

interface AudioErrorDisplayProps {
  error: string;
  file: File;
  onSwitchToNative?: () => void;
  onSwitchToHowler?: () => void;
}

export const AudioErrorDisplay = ({ 
  error, 
  file, 
  onSwitchToNative, 
  onSwitchToHowler 
}: AudioErrorDisplayProps) => {
  // Determine format of the current file
  const format = file.name.split('.').pop()?.toUpperCase() || 'Unknown';
  const formatDetails = getAudioFormatDetails(file);
  
  // Determine what action to suggest based on the error
  const shouldSuggestNativeSwitch = error.includes('format') || 
    error.includes('codec') || 
    error.includes('loading') || 
    error.includes('playback');
  
  const shouldSuggestHowlerSwitch = error.includes('native') ||
    error.includes('HTML5') ||
    error.includes('not supported');
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4 mt-0.5" />
      <AlertTitle>Audio Playback Issue</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">{error}</p>
        
        {shouldSuggestNativeSwitch && onSwitchToNative && (
          <div className="flex flex-col space-y-2">
            <p className="text-xs">
              This {format} audio file may have compatibility issues with the current player.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onSwitchToNative}
              className="flex items-center gap-2"
            >
              <ArrowLeftRight className="h-3 w-3" />
              <span>Try Native Player</span>
            </Button>
          </div>
        )}
        
        {shouldSuggestHowlerSwitch && onSwitchToHowler && (
          <div className="flex flex-col space-y-2">
            <p className="text-xs">
              Native playback failed. Try the advanced audio player instead.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onSwitchToHowler}
              className="flex items-center gap-2"
            >
              <ArrowLeftRight className="h-3 w-3" />
              <span>Try Advanced Player</span>
            </Button>
          </div>
        )}
        
        {!formatDetails.isSupported && (
          <p className="text-xs text-yellow-800 dark:text-yellow-400">
            Note: {format} format has limited browser support.
            {formatDetails.recommendation && ` ${formatDetails.recommendation}`}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};
