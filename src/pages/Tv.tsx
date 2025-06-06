
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useTvTabState } from "@/hooks/tv/useTvTabState";
import { useVideoProcessor } from "@/hooks/use-video-processor";
import { usePersistentVideoState } from "@/hooks/tv/usePersistentVideoState";
import { useTvClearState } from "@/hooks/tv/useTvClearState";
import { useTvNotepadState } from "@/hooks/tv/useTvNotepadState";
import VideoSection from "@/components/tv/VideoSection";
import TvTranscriptionSection from "@/components/tv/TvTranscriptionSection";
import TvTypeformEmbed from "@/components/tv/TvTypeformEmbed";
import TvTopSection from "@/components/tv/TvTopSection";
import TvNotePadSection from "@/components/tv/TvNotePadSection";
import TvAnalysisSection from "@/components/tv/TvAnalysisSection";
import NewsSegmentsContainer from "@/components/transcription/NewsSegmentsContainer";

interface UploadedFile extends File {
  preview?: string;
}

const Tv = () => {
  // Use persistent state for uploaded files so they're remembered across navigation
  const [uploadedFiles, setUploadedFiles] = usePersistentState<UploadedFile[]>(
    "tv-uploaded-files",
    [],
    { storage: 'sessionStorage' }
  );
  
  // Initialize local isPlaying state but sync with global persistent state
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Use persistent video state to maintain playback across routes
  const { isActiveMediaRoute, isMediaPlaying, setIsMediaPlaying } = usePersistentVideoState();
  
  // Use persistent state for volume preference
  const [volume, setVolume] = usePersistentState<number[]>(
    "tv-player-volume",
    [50],
    { storage: 'localStorage' }
  );
  
  // Use TV tab state for persisting transcription text
  const { textContent, setTextContent } = useTvTabState({
    persistKey: "tv-transcription",
    storage: 'sessionStorage',
    persistTextContent: true
  });

  // Sync local playing state with global state
  useEffect(() => {
    if (isActiveMediaRoute) {
      setIsPlaying(isMediaPlaying);
    }
  }, [isActiveMediaRoute, isMediaPlaying]);

  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    transcriptionResult,
    transcriptionId,
    newsSegments,
    processVideo,
    setTranscriptionText: setVideoProcessorText,
    setNewsSegments
  } = useVideoProcessor();

  // Add clear state management
  const {
    handleClearAll,
    handleEditorRegisterReset,
    setClearAnalysis,
    clearingProgress,
    clearingStage,
    lastAction
  } = useTvClearState({
    persistKey: "tv-files",
    onTextChange: setTextContent,
    files: uploadedFiles,
    setFiles: setUploadedFiles,
    setNewsSegments,
    setTranscriptionText: setVideoProcessorText,
  });

  // Add notepad state
  const {
    content: notepadContent,
    setContent: setNotepadContent,
    isExpanded: isNotepadExpanded,
    setIsExpanded: setIsNotepadExpanded,
  } = useTvNotepadState({
    persistKey: "tv-notepad",
    storage: 'sessionStorage'
  });

  // Sync videoProcessor text with our persisted text state
  useEffect(() => {
    if (transcriptionText && transcriptionText !== textContent) {
      setTextContent(transcriptionText);
    }
  }, [transcriptionText, setTextContent, textContent]);

  // When our text content changes externally, update the processor state
  useEffect(() => {
    if (textContent && textContent !== transcriptionText) {
      setVideoProcessorText(textContent);
    }
  }, [textContent, transcriptionText, setVideoProcessorText]);

  // Enhanced text change handler to update both states
  const handleTranscriptionChange = (text: string) => {
    setTextContent(text);
    setVideoProcessorText(text);
  };

  const testAnalysis = {
    quien: "José Luis Pérez, Secretario del Departamento de Desarrollo Económico",
    que: "Anunció un nuevo programa de incentivos para pequeños y medianos empresarios",
    cuando: "Durante una conferencia de prensa esta mañana, 15 de marzo de 2024",
    donde: "Centro de Convenciones de San Juan, Puerto Rico",
    porque: "Para impulsar la recuperación económica y crear nuevos empleos en sectores clave de la economía local",
    summary: "El Secretario del Desarrollo Económico presentó una iniciativa significativa que incluye $50 millones en incentivos para PyMEs, enfocándose en sectores como tecnología, manufactura y agricultura. El programa busca generar 5,000 nuevos empleos en los próximos 18 meses.",
    alerts: [
      "Mención directa de cliente: Departamento de Desarrollo Económico",
      "Tema de alto impacto: Desarrollo económico y empleos",
      "Oportunidad de negocio: Programa de incentivos"
    ],
    keywords: [
      "desarrollo económico",
      "incentivos",
      "PyMEs",
      "empleos",
      "recuperación económica",
      "tecnología",
      "manufactura",
      "agricultura"
    ]
  };

  const togglePlayback = () => {
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    setIsMediaPlaying(newPlayingState);
  };

  const handleTranscriptionComplete = (text: string) => {
    handleTranscriptionChange(text);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSeekToTimestamp = (timestamp: number) => {
    const timeInSeconds = timestamp / 1000;
    
    const videoElements = document.querySelectorAll('video');
    if (videoElements.length > 0) {
      const videoElement = videoElements[0];
      videoElement.currentTime = timeInSeconds;
      videoElement.play();
      setIsPlaying(true);
      setIsMediaPlaying(true);
    } else {
      console.warn('No video element found to seek');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. TopSection - Clear all controls */}
      <TvTopSection
        handleClearAll={handleClearAll}
        files={uploadedFiles}
        transcriptionText={textContent}
        clearingProgress={clearingProgress}
        clearingStage={clearingStage}
      />

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y gestiona contenido de video de manera eficiente
        </p>
      </div>

      {/* 2. VideoSection - Two columns (upload + preview) */}
      <VideoSection
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        isPlaying={isPlaying}
        volume={volume}
        isProcessing={isProcessing}
        progress={progress}
        onTogglePlayback={togglePlayback}
        onVolumeChange={setVolume}
        onProcess={processVideo}
        onTranscriptionComplete={handleTranscriptionComplete}
        onRemoveFile={handleRemoveFile}
        isActiveMediaRoute={isActiveMediaRoute}
      />

      {/* 3. TranscriptionSection - Transcription editing only */}
      {textContent && (
        <TvTranscriptionSection 
          textContent={textContent}
          isProcessing={isProcessing}
          transcriptionMetadata={transcriptionMetadata}
          transcriptionResult={transcriptionResult}
          transcriptionId={transcriptionId}
          onTranscriptionChange={handleTranscriptionChange}
          onSeekToTimestamp={handleSeekToTimestamp}
          onSegmentsReceived={setNewsSegments}
          registerEditorReset={handleEditorRegisterReset}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onPlayPause={togglePlayback}
        />
      )}

      {/* 4. NotePadSection - Notepad for annotations */}
      <TvNotePadSection
        notepadContent={notepadContent}
        onNotepadContentChange={setNotepadContent}
        isExpanded={isNotepadExpanded}
        onExpandToggle={setIsNotepadExpanded}
      />

      {/* 5. TypeformEmbed - Typeform integration */}
      <TvTypeformEmbed />

      {/* 6. AnalysisSection - AI analysis results */}
      {textContent && (
        <TvAnalysisSection
          transcriptionText={textContent}
          transcriptionId={transcriptionId}
          transcriptionResult={transcriptionResult}
          testAnalysis={testAnalysis}
          onClearAnalysis={setClearAnalysis}
          lastAction={lastAction}
        />
      )}

      {/* 7. NewsSegmentsSection - News segments (if available) */}
      {newsSegments && newsSegments.length > 0 && (
        <NewsSegmentsContainer
          segments={newsSegments}
          onSegmentsChange={setNewsSegments}
          onSeek={handleSeekToTimestamp}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default Tv;
