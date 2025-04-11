
import { Textarea } from "@/components/ui/textarea";

interface AnalysisResultProps {
  analysis: string;
}

const AnalysisResult = ({ analysis }: AnalysisResultProps) => {
  if (!analysis) return null;
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Resultado del Análisis:</h3>
      <Textarea 
        className="min-h-[150px] w-full" 
        value={analysis} 
        readOnly 
      />
    </div>
  );
};

export default AnalysisResult;
