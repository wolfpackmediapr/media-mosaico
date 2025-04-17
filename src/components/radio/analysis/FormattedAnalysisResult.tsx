
import { Card } from "@/components/ui/card";
import { SpeakerIcon, ShoppingCart } from "lucide-react";

interface FormattedAnalysisResultProps {
  analysis: string;
}

const FormattedAnalysisResult = ({ analysis }: FormattedAnalysisResultProps) => {
  if (!analysis) return null;

  const isAdvertisement = analysis.includes("[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]");
  const contentType = isAdvertisement ? "Anuncio Publicitario" : "Programa Regular";
  
  // Remove the content type header from display
  const cleanContent = analysis.replace(/\[TIPO DE CONTENIDO:.*?\]\n?/, '').trim();

  return (
    <Card className={`p-4 ${isAdvertisement ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
      <div className="flex items-center gap-2 mb-4 text-lg font-medium">
        {isAdvertisement ? (
          <ShoppingCart className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        ) : (
          <SpeakerIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        )}
        <span className={isAdvertisement ? "text-yellow-700 dark:text-yellow-300" : "text-blue-700 dark:text-blue-300"}>
          {contentType}
        </span>
      </div>
      <div className="whitespace-pre-wrap">
        {cleanContent}
      </div>
    </Card>
  );
};

export default FormattedAnalysisResult;
