
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface ProcessButtonProps {
  isProcessing: boolean;
  processingComplete: boolean;
  progress: number;
  onProcess: () => void;
  isUploaded?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({
  isProcessing,
  processingComplete,
  progress,
  onProcess,
  isUploaded = false,
  isUploading = false,
  uploadProgress = 0
}) => {
  // Button is disabled if processing, already completed, or uploading
  const isDisabled = isProcessing || processingComplete || (isUploaded && !isUploading);
  
  // Button text based on state
  let buttonText = "Procesar";
  
  if (isUploading) {
    buttonText = `Subiendo ${Math.round(uploadProgress)}%`;
  } else if (isUploaded && !processingComplete) {
    buttonText = "Archivo Subido";
  } else if (isProcessing) {
    buttonText = `Procesando ${Math.round(progress)}%`;
  } else if (processingComplete) {
    buttonText = "Completado";
  }
  
  return (
    <Button
      disabled={isDisabled}
      onClick={onProcess}
      className="w-full"
      variant={processingComplete || isUploaded ? "outline" : "default"}
    >
      {(isProcessing || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
};

export default ProcessButton;
