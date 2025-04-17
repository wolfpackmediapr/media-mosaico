
import { Card } from "@/components/ui/card";
import { SpeakerIcon, ShoppingCart } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface FormattedAnalysisResultProps {
  analysis: string;
}

const FormattedAnalysisResult = ({ analysis }: FormattedAnalysisResultProps) => {
  if (!analysis) return null;

  const [editableContent, setEditableContent] = useState(analysis);

  // Split content by content type markers
  const contentParts = editableContent.split(/\[TIPO DE CONTENIDO:.*?\]\n?/).filter(Boolean);
  const contentTypes = editableContent.match(/\[TIPO DE CONTENIDO:.*?\]/g) || [];

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
        <Textarea
          value={content.trim()}
          onChange={(e) => {
            const newContent = [...contentParts];
            newContent[index] = e.target.value;
            
            // Reconstruct the full content with content type markers
            const updatedContent = newContent.map((part, i) => {
              return `${contentTypes[i] || ''}${part}`;
            }).join('\n');
            
            setEditableContent(updatedContent);
          }}
          className="min-h-[100px]"
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

export default FormattedAnalysisResult;
