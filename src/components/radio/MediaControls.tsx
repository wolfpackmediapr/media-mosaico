
import { MusicCard } from "@/components/ui/music-card";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Minimize2, PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStickyState } from "@/hooks/use-sticky-state";
import { AudioMetadataDisplay, AudioPlayerState, AudioControls } from "@/types/player";

interface UploadedFile extends File {
  preview?: string;
}

interface MediaControlsProps extends AudioPlayerState, AudioControls {
  currentFile?: UploadedFile;
  metadata?: AudioMetadataDisplay;
}

const MediaControls = ({
  currentFile,
  metadata,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onSkip,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange
}: MediaControlsProps) => {
  const { isSticky, stickyRef, toggleSticky } = useStickyState({
    persistKey: 'radio-musiccard-sticky',
    defaultSticky: false,
    storage: 'sessionStorage'
  });

  if (!currentFile) return null;

  // Using the Publimedia green color (#66cc00)
  const publimediaGreen = "#66cc00";

  // Create a memoized wrapper for playback rate change to handle cycling through rates
  const handlePlaybackRateChange = useCallback(() => {
    // Calculate next rate (0.5 -> 1.0 -> 1.5 -> 2.0 -> 0.5)
    const nextRate = playbackRate >= 2 ? 0.5 : playbackRate + 0.5;
    onPlaybackRateChange(nextRate);
  }, [playbackRate, onPlaybackRateChange]);

  return (
    <div
      ref={stickyRef}
      className={cn(
        "relative transition-all",
        isSticky &&
          "fixed bottom-4 right-4 w-[26rem] max-w-[calc(100vw-2rem)] z-50 shadow-2xl rounded-xl bg-background/95 backdrop-blur animate-in slide-in-from-bottom-4"
      )}
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={toggleSticky}
        className="absolute top-2 right-2 z-10 h-7 w-7 shadow-md"
        title={isSticky ? "Restaurar reproductor" : "Modo flotante"}
        aria-label={isSticky ? "Restaurar reproductor" : "Activar modo flotante"}
      >
        {isSticky ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <PictureInPicture2 className="h-3.5 w-3.5" />
        )}
      </Button>

      <MusicCard
        file={currentFile}
        title={currentFile.name}
        artist={metadata?.emisora || 'Radio Transcription'}
        mainColor={publimediaGreen}
        customControls={true}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isMuted={isMuted}
        volume={Array.isArray(volume) ? volume : [volume * 100]}
        playbackRate={playbackRate}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onSkip={onSkip}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onPlaybackRateChange={handlePlaybackRateChange}
      />
    </div>
  );
};

export default MediaControls;
