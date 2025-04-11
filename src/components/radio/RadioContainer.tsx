
import { useState } from "react";
import FileUploadSection from "./FileUploadSection";
import RadioTranscriptionSlot from "./RadioTranscriptionSlot";
import RadioNewsSegmentsContainer, { RadioNewsSegment } from "./RadioNewsSegmentsContainer";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useAudioPlayer } from "@/hooks/radio/use-audio-player";
import AuthCheck from "./AuthCheck";
import MediaControls from "./MediaControls";
import TypeformAlert from "./TypeformAlert";

interface UploadedFile extends File {
  preview?: string;
}

const RadioContainer = () => {
  const { isAuthenticated } = useAuthStatus();
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
    station_id?: string;
    program_id?: string;
  }>({});
  const [newsSegments, setNewsSegments] = useState<RadioNewsSegment[]>([]);

  const currentFile = files.length > 0 && currentFileIndex < files.length 
    ? files[currentFileIndex] 
    : undefined;

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    seekToTimestamp
  } = useAudioPlayer({
    file: currentFile
  });

  const handleTranscriptionChange = (newText: string) => {
    setTranscriptionText(newText);
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
    station_id: string;
    program_id: string;
  }) => {
    setMetadata(newMetadata);
  };

  // Authentication check
  if (isAuthenticated === false || isAuthenticated === null) {
    return <AuthCheck isAuthenticated={isAuthenticated} />;
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
          
          {currentFile && (
            <MediaControls
              currentFile={currentFile}
              metadata={metadata}
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
          onSeek={seekToTimestamp}
          isProcessing={isProcessing}
        />
      )}

      <TypeformAlert isAuthenticated={isAuthenticated} />
    </div>
  );
};

export default RadioContainer;
