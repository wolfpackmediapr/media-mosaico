
import React from 'react';
import { Button } from "@/components/ui/button";
import { ProcessButtonProps } from './types';

export const ProcessButton: React.FC<ProcessButtonProps> = ({
  isProcessing,
  processingComplete,
  progress,
  onProcess
}) => {
  const getButtonText = () => {
    if (!isProcessing && !processingComplete) return "Procesar Transcripción";
    if (processingComplete) return "Procesamiento completado";
    return `Procesando: ${progress}%`;
  };

  return (
    <Button
      className="w-full relative"
      onClick={onProcess}
      disabled={isProcessing || processingComplete}
      variant={processingComplete ? "secondary" : "default"}
    >
      {getButtonText()}
    </Button>
  );
};

export default ProcessButton;
