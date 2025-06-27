
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Eraser } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NewsSegment } from "@/hooks/tv/useTvVideoProcessor";

interface TvNotePadSectionProps {
  content: string;
  onContentChange: (content: string) => void;
  segments?: NewsSegment[];
  onSeekToTimestamp?: (timestamp: number) => void;
}

const TvNotePadSection: React.FC<TvNotePadSectionProps> = ({
  content,
  onContentChange,
  segments = [],
  onSeekToTimestamp
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleCopy = async () => {
    if (!content.trim()) return;

    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Éxito",
        description: "Contenido copiado al portapapeles",
        variant: "default"
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Error",
        description: "No se pudo copiar el contenido",
        variant: "destructive"
      });
    }
  };

  const handleClear = () => {
    if (!content.trim()) return;

    onContentChange("");
    toast({
      title: "Éxito",
      description: "Notas borradas",
      variant: "default"
    });
  };

  if (!isExpanded) {
    return (
      <div className="flex justify-between items-center p-2 bg-muted rounded-md mb-4">
        <span className="text-sm font-medium">Bloc de notas TV</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(true)}
          className="h-8 px-2"
        >
          <ChevronDown className="h-4 w-4" />
          <span className="ml-1">Expandir</span>
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <div className="flex justify-between items-center p-2 bg-muted border-b">
        <span className="text-sm font-medium px-2">Bloc de notas TV</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(false)}
          className="h-8 px-2"
        >
          <ChevronUp className="h-4 w-4" />
          <span className="ml-1">Contraer</span>
        </Button>
      </div>
      <CardContent className="p-4">
        <Textarea
          placeholder="Escribe tus notas de TV aquí..."
          className="min-h-[120px] w-full"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
        />
        
        <div className="flex gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!content.trim()}
            className="h-8 px-3"
            aria-label="Copiar contenido al portapapeles"
          >
            <Copy className="h-4 w-4 mr-1" />
            Copiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!content.trim()}
            className="h-8 px-3"
            aria-label="Limpiar notas"
          >
            <Eraser className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Las notas se guardan automáticamente en este navegador
        </div>
      </CardContent>
    </Card>
  );
};

export default TvNotePadSection;
