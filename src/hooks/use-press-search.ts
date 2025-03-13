
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PressClipping } from "@/types/pdf-processing";

interface SearchResult extends PressClipping {
  similarity: number;
}

export const usePressSearch = () => {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchClippings = async (query: string, limit: number = 5, threshold: number = 0.7) => {
    if (!query.trim()) {
      setSearchError("Por favor, ingresa un texto para buscar");
      toast({
        title: "Error de búsqueda",
        description: "Por favor, ingresa un texto para buscar",
        variant: "destructive"
      });
      return [];
    }

    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);

    try {
      console.log(`Searching for clippings with query: "${query}"`);
      
      const { data, error } = await supabase.functions.invoke("search-press-clippings", {
        body: { 
          query, 
          limit, 
          threshold 
        }
      });

      if (error) {
        console.error("Error searching press clippings:", error);
        throw new Error(error.message || "Error al buscar recortes de prensa");
      }
      
      if (!data?.clippings || !Array.isArray(data.clippings)) {
        console.warn("No clippings found or invalid response format");
        setSearchResults([]);
        return [];
      }

      console.log(`Found ${data.clippings.length} results`);
      
      const typedResults = data.clippings.map(clip => ({
        id: clip.id,
        title: clip.title,
        content: clip.content,
        category: clip.category,
        page_number: clip.page_number,
        publication_name: clip.publication_name || "",
        similarity: clip.similarity || 0,
        summary_who: "",
        summary_what: "",
        summary_when: "",
        summary_where: "",
        summary_why: "",
        keywords: [],
        client_relevance: []
      }));

      setSearchResults(typedResults);
      return typedResults;
    } catch (error) {
      console.error("Exception searching press clippings:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setSearchError(errorMessage);
      
      toast({
        title: "Error de búsqueda",
        description: errorMessage,
        variant: "destructive"
      });
      
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchClippings,
    isSearching,
    searchResults,
    searchError,
    setSearchResults
  };
};
