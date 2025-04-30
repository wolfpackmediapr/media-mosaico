
import React from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface ProcessButtonProps {
  isProcessing: boolean;
  processingComplete: boolean;
  progress: number;
  onProcess: () => void;
  isUploaded?: boolean;
}

const ProcessButton: React.FC<ProcessButtonProps> = ({
  isProcessing,
  processingComplete,
  progress,
  onProcess,
  isUploaded
}) => {
  // Button is disabled if processing or already completed
  const isDisabled = isProcessing || processingComplete || isUploaded;
  
  // Button text based on state
  let buttonText = "Procesar";
  
  if (isUploaded && !processingComplete) {
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
      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
};

export default ProcessButton;
