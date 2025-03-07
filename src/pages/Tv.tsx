
import { useState } from "react";
import TranscriptionSlot from "@/components/transcription/TranscriptionSlot";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useVideoProcessor, NewsSegment } from "@/hooks/use-video-processor";
import TvHeader from "@/components/tv/TvHeader";
import VideoSection from "@/components/tv/VideoSection";
import AlertTv from "@/components/tv/AlertTv";

interface UploadedFile extends File {
  preview?: string;
}

const Tv = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);

  const { uploadFile } = useFileUpload();
  const {
    isProcessing,
    progress,
    transcriptionText,
    transcriptionMetadata,
    newsSegments,
    processVideo,
    setTranscriptionText,
    setNewsSegments,
  } = useVideoProcessor();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const result = await uploadFile(file);
      if (result) {
        const uploadedFile = Object.assign(file, { preview: result.preview });
        setUploadedFiles(prev => [...prev, uploadedFile]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTranscriptionComplete = (text: string) => {
    setTranscriptionText(text);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSegmentChange = (index: number, updatedText: string) => {
    setNewsSegments((prev: NewsSegment[]) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], text: updatedText };
      }
      return updated;
    });
  };

  // Adding console logs to debug the news segments
  console.log("News Segments in Tv component:", newsSegments);

  return (
    <div className="space-y-6">
      <TvHeader />

      <VideoSection 
        isDragging={isDragging}
        uploadedFiles={uploadedFiles}
        isPlaying={isPlaying}
        volume={volume}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInput={handleFileInput}
        onTogglePlayback={togglePlayback}
        onVolumeChange={setVolume}
        onRemoveFile={handleRemoveFile}
        onTranscriptionComplete={handleTranscriptionComplete}
        processVideo={processVideo}
      />

      <TranscriptionSlot
        isProcessing={isProcessing}
        transcriptionText={transcriptionText || ""}
        newsSegments={newsSegments}
        metadata={transcriptionMetadata || {
          channel: "",
          program: "",
          category: "",
          broadcastTime: ""
        }}
        onTranscriptionChange={setTranscriptionText}
        onSegmentChange={handleSegmentChange}
      />

      <AlertTv />
    </div>
  );
};

export default Tv;
