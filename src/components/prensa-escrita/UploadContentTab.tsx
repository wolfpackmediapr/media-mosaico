
import React from "react";
import PDFUploadContainer from "@/components/prensa-escrita/upload/PDFUploadContainer";
import SearchClippingsContainer from "@/components/prensa-escrita/search/SearchClippingsContainer";

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
      <PDFUploadContainer 
        onFileSelect={onFileSelect}
        onCancelProcessing={onCancelProcessing}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />
      
      <SearchClippingsContainer />
    </div>
  );
};

export default UploadContentTab;
