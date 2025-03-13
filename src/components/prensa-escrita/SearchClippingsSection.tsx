
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PressClippingCard from "./PressClippingCard";

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  publication_name: string;
  similarity: number;
}

const SearchClippingsSection = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Búsqueda vacía",
        description: "Por favor, ingresa un término de búsqueda",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-press-clippings", {
        body: {
          query: searchQuery,
          matchThreshold: 0.65,
          matchCount: 5
        }
      });

      if (error) throw error;

      setSearchResults(data.similarClippings || []);
      
      if ((data.similarClippings || []).length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron recortes de prensa similares",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error searching clippings:", error);
      toast({
        title: "Error de búsqueda",
        description: "No se pudo completar la búsqueda",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buscar Recortes Similares
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por contenido similar..."
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              "Buscar"
            )}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Resultados de búsqueda:</h3>
            <div className="grid grid-cols-1 gap-4">
              {searchResults.map((result) => (
                <PressClippingCard
                  key={result.id}
                  id={result.id}
                  title={result.title}
                  content={result.content}
                  category={result.category}
                  pageNumber={result.page_number}
                  publicationName={result.publication_name}
                  similarity={result.similarity}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchClippingsSection;
