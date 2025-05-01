import { useState, useEffect } from "react";
import { useRadioFiles } from "@/hooks/radio/useRadioFiles";
import { useClearRadioState } from "@/hooks/radio/useClearRadioState";
import { useTranscriptionManagement } from "@/hooks/radio/useTranscriptionManagement";
import { useRadioPlayer } from "@/hooks/radio/useRadioPlayer";
import { toast } from "sonner";
import { UploadedFile } from "@/components/radio/types";
import { TranscriptionResult } from "@/services/audio/transcriptionService";
import { RadioNewsSegment } from "@/components/radio/RadioNewsSegmentsContainer"; // Use the correct path if different

interface UseRadioContainerStateProps {
  persistedText?: string;
  onTextChange?: (text: string) => void;
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  isActiveMediaRoute?: boolean;
  isMediaPlaying?: boolean;
  setIsMediaPlaying?: (isPlaying: boolean) => void;
}

// Define the explicit return type for the hook
interface RadioContainerState {
  files: UploadedFile[];
  currentFile: UploadedFile | null;
  currentFileIndex: number;
  isProcessing: boolean;
  progress: number;
  transcriptionText: string;
  transcriptionId?: string;
  transcriptionResult?: TranscriptionResult;
  metadata?: { emisora?: string; programa?: string; horario?: string; categoria?: string; station_id?: string; program_id?: string; };
  newsSegments: RadioNewsSegment[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number[]; // Explicitly number[]
  isMuted: boolean;
  playbackRate: number;
  playbackErrors: string | null;
  lastAction: string | null;
  handleClearAll: () => void;
  handleTrackSelect: (index: number) => void;
  handleFilesAdded: (newFiles: File[]) => void;
  setFiles: (files: UploadedFile[]) => void;
  setCurrentFileIndex: (index: number) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  setTranscriptionText: (text: string) => void;
  setTranscriptionId: (id?: string) => void;
  handleTranscriptionReceived: (result: TranscriptionResult) => void;
  handleTranscriptionTextChange: (text: string) => void;
  handleSegmentsReceived: (segments: RadioNewsSegment[]) => void;
  handleMetadataChange: (metadata: { emisora: string; programa: string; horario: string; categoria: string; station_id: string; program_id: string; }) => void;
  handleEditorRegisterReset: (resetFn: () => void) => void;
  setClearAnalysis: React.Dispatch<React.SetStateAction<boolean>>;
  handlePlayPause: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (direction: 'forward' | 'backward') => void;
  handleToggleMute: () => void;
  handleVolumeChange: (value: number[]) => void; // Explicitly (value: number[]) => void
  handlePlaybackRateChange: (rate: number) => void;
  handleSeekToSegment: (segmentOrTime: RadioNewsSegment | number) => void;
  setNewsSegments: React.Dispatch<React.SetStateAction<RadioNewsSegment[]>>;
  handleTranscriptionProcessingError: (error: any) => void;
}


export const useRadioContainerState = ({
  persistedText = "",
  onTextChange,
  persistKey = "radio-files",
  storage = "sessionStorage",
  isActiveMediaRoute = true,
  isMediaPlaying = false,
  setIsMediaPlaying = () => {}
}: UseRadioContainerStateProps): RadioContainerState => {
  // Removed authentication check from here since it's now handled in the parent component
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [playbackErrors, setPlaybackErrors] = useState<string | null>(null);

  const {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleRemoveFile,
    handleFilesAdded
  } = useRadioFiles({
    persistKey,
    storage
  });

  const {
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    transcriptionText,
    setTranscriptionText,
    transcriptionId,
    setTranscriptionId,
    transcriptionResult,
    metadata,
    newsSegments,
    setNewsSegments,
    handleTranscriptionTextChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleTranscriptionReceived,
    resetTranscription,
    handleTranscriptionProcessingError
  } = useTranscriptionManagement();

  const { 
    clearAllState, 
    handleEditorRegisterReset, 
    setClearAnalysis 
  } = useClearRadioState({
    transcriptionId,
    persistKey,
    onTextChange
  });

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors: audioPlaybackErrors,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment
  } = useRadioPlayer({
    currentFile,
    isActiveMediaRoute,
    isMediaPlaying,
    setIsMediaPlaying,
    persistedText,
    transcriptionText,
    setTranscriptionText,
    onTextChange
  });

  // Sync audio errors with component state
  useEffect(() => {
    if (audioPlaybackErrors !== playbackErrors) {
      setPlaybackErrors(audioPlaybackErrors);
    }
  }, [audioPlaybackErrors, playbackErrors]);

  const handleClearAll = () => {
    console.log('[RadioContainer] handleClearAll: Starting clear sequence');
    resetTranscription();
    setNewsSegments([]);
    setFiles([]);
    setCurrentFileIndex(0);
    clearAllState();
    setPlaybackErrors(null);
    toast.success('Todos los datos han sido borrados');
    setLastAction('clear');
  };

  const handleTrackSelect = (index: number) => {
    if (index !== currentFileIndex) {
      setCurrentFileIndex(index);
      setPlaybackErrors(null); // Reset errors when changing tracks
      setLastAction('track-select');
    }
  };

  // Fixed function to properly handle the return type
  const enhancedHandleFilesAdded = (newFiles: File[]) => {
    // Call the original function
    const result = handleFilesAdded(newFiles);
    
    // If files were added, show success toast
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} archivos añadidos correctamente`);
      setLastAction('files-added');
      setPlaybackErrors(null); // Reset errors when adding new files
    }
    
    // Return the result of the original function
    return result;
  };

  return {
    // Files
    files,
    currentFile,
    currentFileIndex,
    // Processing
    isProcessing,
    progress,
    // Transcription
    transcriptionText,
    transcriptionId,
    transcriptionResult,
    metadata,
    newsSegments,
    // Player
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackErrors,
    // State tracking
    lastAction,
    // Handlers
    handleClearAll,
    handleTrackSelect,
    handleFilesAdded: enhancedHandleFilesAdded,
    setFiles,
    setCurrentFileIndex,
    setIsProcessing,
    setProgress,
    setTranscriptionText,
    setTranscriptionId,
    handleTranscriptionReceived,
    handleTranscriptionTextChange,
    handleSegmentsReceived,
    handleMetadataChange,
    handleEditorRegisterReset,
    setClearAnalysis,
    handlePlayPause,
    handleSeek,
    handleSkip,
    handleToggleMute,
    handleVolumeChange,
    handlePlaybackRateChange,
    handleSeekToSegment,
    setNewsSegments,
    handleTranscriptionProcessingError
  };
};
