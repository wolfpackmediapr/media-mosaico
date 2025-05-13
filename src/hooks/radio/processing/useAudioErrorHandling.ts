
import { useEffect, useState, useRef } from 'react';
import { getAudioFormatDetails, canBrowserPlayFile } from '@/utils/audio';
import { toast } from 'sonner';
import { UploadedFile } from '@/components/radio/types';

interface AudioErrorHandlingOptions {
  currentFile: UploadedFile | null;
  playerAudioError: string | null;
  onSwitchToNative?: () => void;
}

export const useAudioErrorHandling = ({
  currentFile,
  playerAudioError,
  onSwitchToNative
}: AudioErrorHandlingOptions) => {
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const hasShownErrorRef = useRef(false);
  
  // Check audio format compatibility when file changes
  useEffect(() => {
    if (!currentFile) {
      setFormatWarning(null);
      hasShownErrorRef.current = false;
      return;
    }
    
    try {
      // Check file format compatibility
      const formatDetails = getAudioFormatDetails(currentFile);
      
      if (formatDetails.recommendation) {
        setFormatWarning(formatDetails.recommendation);
      } else {
        setFormatWarning(null);
      }
      
      if (!formatDetails.isSupported && !hasShownErrorRef.current) {
        toast.warning(`Audio format ${formatDetails.extension} has limited support in this browser.`);
        hasShownErrorRef.current = true;
      }
    } catch (error) {
      console.error('[useAudioErrorHandling] Error checking file format:', error);
    }
  }, [currentFile]);
  
  // Handle playback errors
  useEffect(() => {
    if (!playerAudioError || !currentFile || !onSwitchToNative) return;
    
    // If we have an error and it's related to format or codec issues,
    // suggest switching to native audio
    if (
      playerAudioError.includes('format') || 
      playerAudioError.includes('codec') ||
      playerAudioError.includes('playback')
    ) {
      const canPlay = canBrowserPlayFile(currentFile);
      
      if (canPlay) {
        console.log('[useAudioErrorHandling] Suggesting native audio player');
        toast.error(
          playerAudioError,
          {
            description: 'Switching to native audio player',
            action: {
              label: 'Switch',
              onClick: onSwitchToNative
            }
          }
        );
      } else {
        toast.error(
          'Audio format not supported',
          {
            description: 'This audio format may not be supported in your browser.'
          }
        );
      }
    }
  }, [playerAudioError, currentFile, onSwitchToNative]);
  
  return {
    formatWarning
  };
};
