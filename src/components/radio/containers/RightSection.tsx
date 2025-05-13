
import React, { useEffect, useRef, memo } from "react";
import MediaControls from "../MediaControls";
import TrackList from "../TrackList";
import { useMediaPersistence } from "@/context/MediaPersistenceContext";
import { AudioErrorDisplay } from "../audio-player/errors/AudioErrorDisplay";
import { isValidFileForBlobUrl, isBlobUrlFormat } from "@/utils/audio-url-validator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FileWarning } from "lucide-react";

interface RightSectionProps {
  currentFile: File | null;
  metadata: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  files: File[];
  currentFileIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number[];
  playbackRate: number;
  playbackErrors?: string | null;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (direction: 'forward' | 'backward') => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onPlaybackRateChange: () => void;
  handleTrackSelect: (index: number) => void;
  onSwitchToNative?: () => void;
  onValidateFileUrl?: () => Promise<boolean>;
}

// Use memo to prevent unnecessary re-renders
const RightSection = memo(({
  currentFile,
  metadata,
  files,
  currentFileIndex,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume,
  playbackRate,
  playbackErrors,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  handleTrackSelect,
  onSwitchToNative,
  onValidateFileUrl
}: RightSectionProps) => {
  const { lastPlaybackPosition, setLastPlaybackPosition } = useMediaPersistence();
  const previousTimeRef = useRef<number>(currentTime);
  const [fileInvalid, setFileInvalid] = React.useState(false);
  const lastValidationRef = useRef<number>(0);
  const validationInProgressRef = useRef<boolean>(false);

  // Check if current file is valid
  useEffect(() => {
    if (currentFile) {
      const isInvalid = !isValidFileForBlobUrl(currentFile);
      setFileInvalid(isInvalid);
      
      if (isInvalid) {
        console.warn('[RightSection] Current file is invalid or reconstructed:', currentFile.name);
      }
    } else {
      setFileInvalid(false);
    }
  }, [currentFile]);

  // Throttled validation function to prevent excessive validation attempts
  const throttledValidateUrl = React.useCallback(async () => {
    // Skip if no validation function provided
    if (!onValidateFileUrl) return false;
    
    // Skip if another validation is in progress
    if (validationInProgressRef.current) return false;
    
    // Throttle validation attempts (once every 5 seconds)
    const now = Date.now();
    if (now - lastValidationRef.current < 5000) {
      return false;
    }
    
    try {
      validationInProgressRef.current = true;
      lastValidationRef.current = now;
      
      return await onValidateFileUrl();
    } catch (error) {
      console.error('[RightSection] Error during throttled URL validation:', error);
      return false;
    } finally {
      validationInProgressRef.current = false;
    }
  }, [onValidateFileUrl]);

  // Handle document visibility changes to maintain audio playback across tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When tab becomes visible again, ensure audio state is correctly synced and validate Blob URLs
      if (!document.hidden && currentFile && !fileInvalid) {
        console.log("[RightSection] Tab became visible, ensuring audio state is synced");
        
        // Validate current file's blob URL if available
        throttledValidateUrl().catch(error => {
          console.error('[RightSection] Error validating file URL:', error);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentFile, throttledValidateUrl, fileInvalid]);

  // When a file is first loaded, validate its URL
  useEffect(() => {
    if (currentFile && !fileInvalid && 
        'preview' in currentFile && 
        isBlobUrlFormat(currentFile.preview as string)) {
      throttledValidateUrl().catch(error => {
        console.error('[RightSection] Error validating initial file URL:', error);
      });
    }
  }, [currentFile, throttledValidateUrl, fileInvalid]);

  // Save playback position when it changes significantly
  useEffect(() => {
    if (currentFile && !fileInvalid && Math.abs(currentTime - previousTimeRef.current) > 1) {
      previousTimeRef.current = currentTime;
      
      // Only update if we have a valid position
      if (currentTime > 0) {
        const fileId = currentFile.name + '-' + currentFile.size;
        setLastPlaybackPosition({
          ...lastPlaybackPosition,
          [fileId]: currentTime
        });
      }
    }
  }, [currentTime, currentFile, lastPlaybackPosition, setLastPlaybackPosition, fileInvalid]);

  // Register for Media Session API when available
  useEffect(() => {
    if ('mediaSession' in navigator && currentFile && !fileInvalid) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentFile.name,
        artist: metadata?.emisora || 'Radio',
        album: metadata?.programa || 'Transcripción'
      });
      
      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      
      // Register action handlers
      navigator.mediaSession.setActionHandler('play', onPlayPause);
      navigator.mediaSession.setActionHandler('pause', onPlayPause);
      navigator.mediaSession.setActionHandler('seekbackward', () => onSkip('backward'));
      navigator.mediaSession.setActionHandler('seekforward', () => onSkip('forward'));
      
      return () => {
        // Clear handlers when component unmounts
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      };
    }
  }, [currentFile, metadata, isPlaying, onPlayPause, onSkip, fileInvalid]);

  return (
    <div className="space-y-4">
      {/* Show file invalid warning */}
      {fileInvalid && currentFile && (
        <Alert variant="destructive" className="mb-4">
          <FileWarning className="h-4 w-4 mr-2" />
          <AlertTitle>Archivo no reproducible</AlertTitle>
          <AlertDescription>
            Este archivo no se puede reproducir porque fue reconstruido después de refrescar la página.
            Por favor, suba el archivo de nuevo o elimínelo.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Enhanced error display component */}
      {playbackErrors && currentFile && !fileInvalid && (
        <AudioErrorDisplay 
          error={playbackErrors} 
          file={currentFile}
          onSwitchToNative={onSwitchToNative}
          onRetryUrl={throttledValidateUrl}
        />
      )}
      
      {currentFile && !fileInvalid && (
        <MediaControls
          currentFile={currentFile}
          metadata={metadata}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isMuted={isMuted}
          volume={volume}
          playbackRate={playbackRate}
          onPlayPause={onPlayPause}
          onSeek={onSeek}
          onSkip={onSkip}
          onToggleMute={onToggleMute}
          onVolumeChange={onVolumeChange}
          onPlaybackRateChange={onPlaybackRateChange}
        />
      )}
      
      {files.length > 0 && (
        <TrackList
          files={files}
          currentFileIndex={currentFileIndex}
          onSelectTrack={handleTrackSelect}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
        />
      )}
    </div>
  );
});

export default RightSection;
