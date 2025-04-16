
import { useState, useEffect } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useTvTabState } from "@/hooks/tv/useTvTabState";
import { useVideoProcessor } from "@/hooks/use-video-processor";
import VideoSection from "@/components/tv/VideoSection";
import TvTranscriptionSection from "@/components/tv/TvTranscriptionSection";
import TvTypeformEmbed from "@/components/tv/TvTypeformEmbed";

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
  
  const [isPlaying, setIsPlaying] = useState(false);
  
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

  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    newsSegments,
    processVideo,
    setTranscriptionText: setVideoProcessorText,
    setNewsSegments
  } = useVideoProcessor();

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
    setIsPlaying(!isPlaying);
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
    } else {
      console.warn('No video element found to seek');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y gestiona contenido de video de manera eficiente
        </p>
      </div>

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
      />

      {textContent && (
        <TvTranscriptionSection 
          textContent={textContent}
          newsSegments={newsSegments}
          isProcessing={isProcessing}
          transcriptionMetadata={transcriptionMetadata}
          testAnalysis={testAnalysis}
          onTranscriptionChange={handleTranscriptionChange}
          onSegmentsChange={setNewsSegments}
          onSeekToTimestamp={handleSeekToTimestamp}
          onSegmentsReceived={setNewsSegments}
        />
      )}

      <TvTypeformEmbed />
    </div>
  );
};

export default Tv;
