
import { Button } from "@/components/ui/button";

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
      className="w-full"
    >
      {getButtonText()}
    </Button>
  );
};

export default ProcessButton;
