
import React from "react";
import PDFUploadZone from "@/components/prensa-escrita/PDFUploadZone";
import SearchClippingsSection from "@/components/prensa-escrita/SearchClippingsSection";

interface UploadContentTabProps {
  onFileSelect: (file: File, publicationName: string) => void;
  onCancelProcessing?: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

const UploadContentTab = ({
  onFileSelect,
  onCancelProcessing,
  isUploading,
  uploadProgress
}: UploadContentTabProps) => {
  return (
    <div className="space-y-6">
      <PDFUploadZone 
        onFileSelect={onFileSelect}
        onCancelProcessing={onCancelProcessing}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />
      
      <SearchClippingsSection />
    </div>
  );
};

export default UploadContentTab;
