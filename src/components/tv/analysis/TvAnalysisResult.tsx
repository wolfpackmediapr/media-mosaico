
import TvFormattedAnalysisResult from "./TvFormattedAnalysisResult";
import { Loader } from "lucide-react";

interface TvAnalysisResultProps {
  analysis: string;
  isLoading?: boolean;
}

const TvAnalysisResult = ({ analysis, isLoading }: TvAnalysisResultProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin mr-2" />
        <span>Cargando análisis...</span>
      </div>
    );
  }

  if (!analysis) return null;
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Resultado del Análisis:</h3>
      <TvFormattedAnalysisResult analysis={analysis} />
    </div>
  );
};

export default TvAnalysisResult;
