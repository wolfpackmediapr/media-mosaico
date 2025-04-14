
import { MusicCard } from "@/components/ui/music-card";
import { EnhancedAudioPlayer } from "@/components/radio/audio-player/EnhancedAudioPlayer";
import { useState } from "react";
import { toast } from "sonner";
import { FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioSource } from "@/hooks/radio/audio-player/useAudioSource";

interface UploadedFile extends File {
  preview?: string;
  needsReupload?: boolean;
}

interface MediaControlsProps {
  currentFile?: UploadedFile;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  volume: number[];
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (direction: 'forward' | 'backward', amount?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onPlaybackRateChange: () => void;
  onFileError?: () => void;
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
  onPlaybackRateChange,
  onFileError
}: MediaControlsProps) => {
  const [useLegacyPlayer, setUseLegacyPlayer] = useState(false);
  
  // Use our audio source hook for improved file validation
  const { isValid } = useAudioSource(currentFile, {
    onError: (error) => {
      console.error("Audio source error:", error);
      if (onFileError) {
        onFileError();
      }
    }
  });
  
  if (!currentFile) return null;

  // Check if the file needs reupload
  const needsReupload = currentFile.needsReupload;

  // Using the Publimedia green color (#66cc00)
  const publimediaGreen = "#66cc00";

  // If the file needs to be reuploaded, show a message
  if (needsReupload || !isValid) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <FileWarning className="text-amber-500 h-6 w-6" />
          <h3 className="text-amber-700 font-medium">
            {needsReupload ? "El archivo necesita ser subido de nuevo" : "El archivo no se puede reproducir"}
          </h3>
        </div>
        <p className="text-amber-600 mb-3">
          El archivo <strong>{currentFile.name}</strong> {needsReupload ? 
            "ya no está disponible porque la página se ha recargado." : 
            "no se puede reproducir. El formato puede no ser compatible."}
        </p>
        <p className="text-amber-600 mb-4">
          Por favor, suba el archivo de nuevo para continuar.
        </p>
        <Button
          variant="outline"
          className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={() => {
            // Clear this file or trigger file upload
            if (onFileError) {
              onFileError();
            }
          }}
        >
          Subir archivo de nuevo
        </Button>
      </div>
    );
  }

  // We're providing both the enhanced player and the legacy player with a toggle
  // This ensures backward compatibility while allowing users to try the new player
  return !useLegacyPlayer ? (
    <>
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
        volume={volume}
        playbackRate={playbackRate}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onSkip={onSkip}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        onPlaybackRateChange={onPlaybackRateChange}
      />
      <div className="mt-2 text-center">
        <button 
          className="text-xs text-primary hover:underline" 
          onClick={() => setUseLegacyPlayer(true)}
        >
          Usar reproductor mejorado con persistencia
        </button>
      </div>
    </>
  ) : (
    <>
      {currentFile && (
        <EnhancedAudioPlayer
          file={currentFile}
          onError={(error) => {
            console.error("Audio error:", error);
            toast.error("Error reproduciendo el audio", {
              description: "Por favor, intente subir el archivo de nuevo"
            });
            if (onFileError) {
              onFileError();
            }
          }}
        />
      )}
      <div className="mt-2 text-center">
        <button 
          className="text-xs text-primary hover:underline" 
          onClick={() => setUseLegacyPlayer(false)}
        >
          Volver al reproductor clásico
        </button>
      </div>
    </>
  );
};

export default MediaControls;
