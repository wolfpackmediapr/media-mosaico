
import FormattedAnalysisResult from "./FormattedAnalysisResult";

interface AnalysisResultProps {
  analysis: string;
}

const AnalysisResult = ({ analysis }: AnalysisResultProps) => {
  if (!analysis) return null;
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Resultado del Análisis:</h3>
      <FormattedAnalysisResult analysis={analysis} />
    </div>
  );
};

export default AnalysisResult;
