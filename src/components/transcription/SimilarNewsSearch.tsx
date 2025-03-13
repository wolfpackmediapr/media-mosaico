
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NewsSegment } from "@/hooks/use-video-processor";

interface SimilarNewsSearchProps {
  onSimilarSegmentsFound?: (segments: NewsSegment[]) => void;
}

const SimilarNewsSearch = ({ onSimilarSegmentsFound }: SimilarNewsSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Ingrese un texto para buscar segmentos similares");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-similar-segments', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      if (data?.data && Array.isArray(data.data)) {
        const segments = data.data.map((segment: any) => ({
          headline: segment.segment_title,
          text: segment.transcript,
          start: segment.start_ms,
          end: segment.end_ms,
          keywords: segment.keywords || [],
          // Add similarity score for display
          similarity: (1 - segment.similarity) * 100
        }));
        
        toast.success(`Se encontraron ${segments.length} segmentos similares.`);
        
        if (onSimilarSegmentsFound) {
          onSimilarSegmentsFound(segments);
        }
      } else {
        toast.info("No se encontraron segmentos similares.");
      }
    } catch (error) {
      console.error('Error searching similar segments:', error);
      toast.error("No se pudo buscar segmentos similares. Por favor, intenta nuevamente.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-2xl font-bold text-primary-900 flex items-center gap-2">
          <Search className="w-6 h-6" />
          Búsqueda Semántica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="bg-muted/50 p-4 rounded-md">
          <p className="text-sm text-muted-foreground">
            Busque segmentos similares semánticamente utilizando procesamiento de lenguaje natural.
            Ingrese una consulta para encontrar segmentos de noticias similares en contenido o temática.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ej: situación económica en Puerto Rico"
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimilarNewsSearch;
