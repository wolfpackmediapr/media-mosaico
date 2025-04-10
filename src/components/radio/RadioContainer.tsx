import { useState, useEffect } from "react";
import FileUploadSection from "./FileUploadSection";
import RadioTranscriptionSlot from "./RadioTranscriptionSlot";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MusicCard } from "@/components/ui/music-card";

interface UploadedFile extends File {
  preview?: string;
}

const RadioContainer = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [transcriptionId, setTranscriptionId] = useState<string>();
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [metadata, setMetadata] = useState<{
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  }>({});
  const [newsSegments, setNewsSegments] = useState<RadioNewsSegment[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number[]>([50]);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        setIsAuthenticated(!!session);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (files.length === 0 || currentFileIndex >= files.length) return;

    const audio = new Audio(URL.createObjectURL(files[currentFileIndex]));
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    audio.onended = () => {
      setIsPlaying(false);
    };
    
    audio.volume = volume[0] / 100;
    audio.muted = isMuted;
    audio.playbackRate = playbackRate;
    
    setAudioElement(audio);
    
    return () => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    };
  }, [files, currentFileIndex]);

  const handleTranscriptionChange = (newText: string) => {
    setTranscriptionText(newText);
  };

  const handleSeekToTimestamp = (timestamp: number) => {
    if (audioElement) {
      audioElement.currentTime = timestamp / 1000;
      audioElement.play();
      setIsPlaying(true);
    } else {
      console.warn('No audio element found to seek');
    }
  };

  const handleSegmentsReceived = (segments: RadioNewsSegment[]) => {
    console.log("Received segments:", segments.length);
    if (segments && segments.length > 0) {
      setNewsSegments(segments);
    }
  };

  const handleMetadataChange = (newMetadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
  }) => {
    setMetadata(newMetadata);
    toast.success('Metadata actualizada');
  };

  const handlePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (seconds: number) => {
    if (!audioElement) return;
    audioElement.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleSkip = (direction: 'forward' | 'backward', amount: number = 10) => {
    if (!audioElement) return;
    
    const newTime = direction === 'forward' 
      ? Math.min(audioElement.duration, audioElement.currentTime + amount)
      : Math.max(0, audioElement.currentTime - amount);
      
    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleToggleMute = () => {
    if (!audioElement) return;
    
    audioElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    if (!audioElement) return;
    
    audioElement.volume = newVolume[0] / 100;
    setVolume(newVolume);
    
    if (newVolume[0] === 0) {
      setIsMuted(true);
      audioElement.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      audioElement.muted = false;
    }
  };

  const handlePlaybackRateChange = () => {
    if (!audioElement) return;
    
    const rates = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    
    audioElement.playbackRate = newRate;
    setPlaybackRate(newRate);
    toast.info(`Velocidad: ${newRate}x`);
  };

  useEffect(() => {
    if (files.length === 0 || currentFileIndex >= files.length) return;

    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (isAuthenticated === false) {
    return (
      <div className="w-full h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Iniciar sesión requerido</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
          Para acceder a la funcionalidad de transcripción de radio, por favor inicia sesión o crea una cuenta.
        </p>
        <Button 
          onClick={() => navigate('/auth')}
          className="flex items-center"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Iniciar sesión
        </Button>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 w-full">
          <FileUploadSection 
            files={files}
            setFiles={setFiles}
            currentFileIndex={currentFileIndex}
            setCurrentFileIndex={setCurrentFileIndex}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            progress={progress}
            setProgress={setProgress}
            transcriptionText={transcriptionText}
            setTranscriptionText={setTranscriptionText}
            setTranscriptionId={setTranscriptionId}
          />
          
          {files.length > 0 && currentFileIndex < files.length && (
            <MusicCard
              file={files[currentFileIndex]}
              title={files[currentFileIndex].name}
              artist={metadata?.emisora || 'Radio Transcription'}
              mainColor="#8B5CF6"
              customControls={true}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              isMuted={isMuted}
              volume={volume}
              playbackRate={playbackRate}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSkip={handleSkip}
              onToggleMute={handleToggleMute}
              onVolumeChange={handleVolumeChange}
              onPlaybackRateChange={handlePlaybackRateChange}
            />
          )}
        </div>
        <div className="w-full">
          <RadioTranscriptionSlot
            isProcessing={isProcessing}
            transcriptionText={transcriptionText}
            transcriptionId={transcriptionId}
            metadata={metadata}
            onTranscriptionChange={handleTranscriptionChange}
            onSegmentsReceived={handleSegmentsReceived}
            onMetadataChange={handleMetadataChange}
          />
        </div>
      </div>

      {newsSegments.length > 0 && (
        <RadioNewsSegmentsContainer
          segments={newsSegments}
          onSegmentsChange={setNewsSegments}
          onSeek={handleSeekToTimestamp}
          isProcessing={isProcessing}
        />
      )}

      <div className="mt-8 p-6 bg-muted rounded-lg w-full">
        <h2 className="text-2xl font-bold mb-4">Alerta Radio</h2>
        <div data-tf-live="01JEWES3GA7PPQN2SPRNHSVHPG" className="h-[500px] md:h-[600px]"></div>
      </div>
    </div>
  );
};

export default RadioContainer;
