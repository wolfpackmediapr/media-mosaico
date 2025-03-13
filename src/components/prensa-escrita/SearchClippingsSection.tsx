
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PressClippingCard from "@/components/prensa-escrita/PressClippingCard";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  publication_name?: string;
  similarity: number;
}

const SearchClippingsSection = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultClipping[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un término de búsqueda",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-press-clippings", {
        body: { query: searchQuery, limit: 5, threshold: 0.7 }
      });

      if (error) throw error;
      
      setSearchResults(data.clippings || []);

      if (data.clippings?.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron recortes de prensa que coincidan con tu búsqueda",
        });
      }
    } catch (error) {
      console.error("Error searching press clippings:", error);
      toast({
        title: "Error de búsqueda",
        description: "No se pudo completar la búsqueda. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Búsqueda de Recortes de Prensa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en recortes de prensa..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {isSearching && (
          <div className="space-y-4">
            <Skeleton className="h-[150px] w-full rounded-lg" />
            <Skeleton className="h-[150px] w-full rounded-lg" />
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Se encontraron {searchResults.length} resultados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {!isSearching && searchResults.length === 0 && searchQuery.trim() !== "" && (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              No se encontraron recortes de prensa que coincidan con tu búsqueda.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchClippingsSection;
