import { useState, useEffect } from "react";
import FileUploadZone from "@/components/upload/FileUploadZone";
import VideoPreview from "@/components/video/VideoPreview";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useVideoProcessor } from "@/hooks/use-video-processor";
import NewsSegmentsContainer from "@/components/transcription/NewsSegmentsContainer";
import { useRef } from "react";

interface UploadedFile extends File {
  preview?: string;
}

const Tv = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { isUploading, uploadProgress, uploadFile } = useFileUpload();
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    newsSegments,
    analysis,
    processVideo,
    setTranscriptionText,
    setNewsSegments
  } = useVideoProcessor();

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

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  export function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  };

  export function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  };

  export function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      uploadFile(file).then(result => {
        if (result) {
          const uploadedFile = Object.assign(file, { preview: result.preview });
          setUploadedFiles(prev => [...prev, uploadedFile]);
        }
      });
    }
  };

  export function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  export function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  export function togglePlayback() {
    setIsPlaying(!isPlaying);
  };

  export function handleTranscriptionComplete(text: string) {
    setTranscriptionText(text);
  };

  export function handleRemoveFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  export function handleSeekToTimestamp(timestamp: number) {
    // Convert milliseconds to seconds for video element
    const timeInSeconds = timestamp / 1000;
    
    // Find the current video element and seek to the timestamp
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y gestiona contenido de video de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FileUploadZone
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />

        <VideoPreview
          uploadedFiles={uploadedFiles}
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
      </div>

      {/* News Segments Container */}
      <NewsSegmentsContainer
        segments={newsSegments}
        onSegmentsChange={setNewsSegments}
        onSeek={handleSeekToTimestamp}
        isProcessing={isProcessing}
      />

      <TranscriptionSlot
        isProcessing={isProcessing}
        transcriptionText={transcriptionText || "Transcripción de ejemplo para probar el análisis de contenido..."}
        metadata={transcriptionMetadata || {
          channel: "WIPR",
          program: "Noticias Puerto Rico",
          category: "Economía",
          broadcastTime: "2024-03-15T10:00:00Z"
        }}
        analysis={testAnalysis}
        onTranscriptionChange={setTranscriptionText}
        newsSegments={newsSegments}
        onNewsSegmentsChange={setNewsSegments}
      />

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Alerta TV</h2>
        <div data-tf-live="01JEWEP95CN5YH8JCET8GEXRSK"></div>
      </div>
    </div>
  );
};

export default Tv;
