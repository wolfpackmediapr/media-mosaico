import TvFormattedAnalysisResult from "./TvFormattedAnalysisResult";

interface TvAnalysisResultProps {
  analysis: string;
}

const TvAnalysisResult = ({ analysis }: TvAnalysisResultProps) => {
  if (!analysis) return null;
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Resultado del Análisis:</h3>
      <TvFormattedAnalysisResult analysis={analysis} />
    </div>
  );
};

export default TvAnalysisResult;