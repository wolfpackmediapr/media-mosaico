import { Card } from "@/components/ui/card";
import { SpeakerIcon, ShoppingCart, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { parseAnalysisContent } from "@/utils/tv/analysisParser";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface TvFormattedAnalysisResultProps {
  analysis: string;
}

/** Convert markdown bold/italic to HTML */
const markdownToHtml = (text: string): string => {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
};

const TvFormattedAnalysisResult = ({ analysis }: TvFormattedAnalysisResultProps) => {
  const analysisString = typeof analysis === 'string' 
    ? analysis 
    : JSON.stringify(analysis, null, 2);

  const formattedAnalysis = parseAnalysisContent(analysisString);
  const [displayContent, setDisplayContent] = useState(formattedAnalysis);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const str = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
    setDisplayContent(parseAnalysisContent(str));
  }, [analysis]);

  if (!analysis) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      toast.success("Texto copiado al portapapeles");
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(() => {
      toast.error("Error al copiar texto");
    });
  };

  const contentParts = displayContent.split(/\[TIPO DE CONTENIDO:.*?\]/)
    .filter(Boolean)
    .map(part => part.trim())
    .filter(part => part.length > 0);
    
  const contentTypes = displayContent.match(/\[TIPO DE CONTENIDO:.*?\]/g) || [];
  
  if (contentTypes.length === 0 && displayContent.trim()) {
    return (
      <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center gap-2 mb-4 text-lg font-medium">
          <SpeakerIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-700 dark:text-blue-300">Programa Regular</span>
        </div>
        <div 
          className="min-h-[200px] max-h-[600px] overflow-y-auto text-foreground whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none p-3 bg-background/50 rounded-md border"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(displayContent)) }}
        />
        <div className="flex justify-end mt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleCopy(displayContent, -1)}
            title="Copiar texto"
          >
            {copiedIndex === -1 ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const renderContentSection = (content: string, type: string, index: number) => {
    const isAdvertisement = type.includes("ANUNCIO PUBLICITARIO");
    
    return (
      <Card 
        key={index}
        className={`p-4 mb-4 ${
          isAdvertisement 
            ? 'bg-yellow-50 dark:bg-yellow-900/20' 
            : 'bg-blue-50 dark:bg-blue-900/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-4 text-lg font-medium">
          {isAdvertisement ? (
            <ShoppingCart className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <SpeakerIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
          <span 
            className={
              isAdvertisement 
                ? "text-yellow-700 dark:text-yellow-300" 
                : "text-blue-700 dark:text-blue-300"
            }
          >
            {isAdvertisement ? "Anuncio Publicitario" : "Programa Regular"}
          </span>
        </div>
        <div 
          className="min-h-[200px] max-h-[600px] overflow-y-auto text-foreground whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none p-3 bg-background/50 rounded-md border"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(markdownToHtml(content)) }}
        />
        <div className="flex justify-end mt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleCopy(content, index)}
            title="Copiar texto"
          >
            {copiedIndex === index ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {contentParts.map((content, index) => 
        renderContentSection(
          content,
          contentTypes[index] || '',
          index
        )
      )}
    </div>
  );
};

export default TvFormattedAnalysisResult;
