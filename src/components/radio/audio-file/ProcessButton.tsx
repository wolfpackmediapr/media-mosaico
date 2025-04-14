
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProcessButtonProps {
  isProcessing: boolean;
  processingComplete: boolean;
  progress: number;
  onProcess: () => void;
  disabled?: boolean;
}

const ProcessButton = ({ 
  isProcessing, 
  processingComplete, 
  progress, 
  onProcess,
  disabled = false
}: ProcessButtonProps) => {
  const getButtonText = () => {
    if (isProcessing) {
      return `Procesando: ${Math.round(progress)}%`;
    }
    
    return processingComplete 
      ? "Transcripción completada"
      : "Procesar transcripción";
  };
  
  return (
    <Button
      onClick={onProcess}
      disabled={isProcessing || processingComplete || disabled}
      variant={processingComplete ? "secondary" : "default"}
      className="w-full relative"
    >
      {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {getButtonText()}
    </Button>
  );
};

export default ProcessButton;
