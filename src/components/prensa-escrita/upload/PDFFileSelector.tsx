import React from "react";
import PDFDropZone from "../PDFDropZone";
import PDFPreview from "../PDFPreview";

interface PDFFileSelectorProps {
  file: File | null;
  thumbnailUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  maxFileSizeMB: number;
  isUploading: boolean;
}

const PDFFileSelector = ({
  file,
  thumbnailUrl,
  onFileSelect,
  onClear,
  maxFileSizeMB,
  isUploading
}: PDFFileSelectorProps) => {
  if (file) {
    return (
      <PDFPreview 
        file={file} 
        thumbnailUrl={thumbnailUrl} 
        onClear={onClear}
        isUploading={isUploading}
      />
    );
  }

  return (
    <PDFDropZone 
      onFileSelect={onFileSelect} 
      maxFileSizeMB={maxFileSizeMB}
      isUploading={isUploading}
    />
  );
};

export default PDFFileSelector;
