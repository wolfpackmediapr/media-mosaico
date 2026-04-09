import { Card } from "@/components/ui/card";
import { SpeakerIcon, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { parseAnalysisContent } from "@/utils/tv/analysisParser";
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
  // Defensive: Convert object to string if needed
  const analysisString = typeof analysis === 'string' 
    ? analysis 
    : JSON.stringify(analysis, null, 2);

  const formattedAnalysis = parseAnalysisContent(analysisString);
  const [displayContent, setDisplayContent] = useState(formattedAnalysis);

  useEffect(() => {
    const str = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
    setDisplayContent(parseAnalysisContent(str));
  }, [analysis]);

  if (!analysis) return null;

  // Split content by content type markers
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
