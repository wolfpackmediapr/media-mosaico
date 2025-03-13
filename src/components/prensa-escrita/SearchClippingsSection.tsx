
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PressClippingCard from "@/components/prensa-escrita/PressClippingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { usePressSearch } from "@/hooks/use-press-search";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SearchClippingsSection = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const { 
    searchClippings,
    isSearching,
    searchResults,
    searchError
  } = usePressSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un término de búsqueda",
        variant: "destructive"
      });
      return;
    }

    await searchClippings(searchQuery);

    if (searchResults.length === 0 && !searchError) {
      toast({
        title: "Sin resultados",
        description: "No se encontraron recortes de prensa que coincidan con tu búsqueda",
      });
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

        {searchError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}

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

        {!isSearching && searchResults.length === 0 && searchQuery.trim() !== "" && !searchError && (
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
