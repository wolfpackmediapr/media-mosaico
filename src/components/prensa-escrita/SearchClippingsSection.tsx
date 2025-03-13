
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PressClippingCard from "@/components/prensa-escrita/PressClippingCard";

interface PressClipping {
  id: string;
  title: string;
  content: string;
  category: string;
  page_number: number;
  publication_name: string;
  similarity: number;
  summary_who?: string;
  summary_what?: string;
  summary_when?: string;
  summary_where?: string;
  summary_why?: string;
  keywords?: string[];
  client_relevance?: string[];
}

const SearchClippingsSection = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PressClipping[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast({
        title: "Error de búsqueda",
        description: "Por favor, ingresa un término de búsqueda",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke("search-press-clippings", {
        body: {
          query: searchQuery,
          limit: 10,
          threshold: 0.5
        }
      });
      
      if (error) throw error;
      
      if (data && data.clippings) {
        setSearchResults(data.clippings);
        
        if (data.clippings.length === 0) {
          toast({
            title: "Sin resultados",
            description: "No se encontraron recortes de prensa que coincidan con tu búsqueda",
          });
        }
      }
    } catch (error) {
      console.error("Error searching clippings:", error);
      toast({
        title: "Error de búsqueda",
        description: "No se pudo realizar la búsqueda",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Search className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-medium">Buscar Recortes de Prensa</h3>
              <p className="text-sm text-gray-500">
                Busca recortes de prensa utilizando palabras clave o frases
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar recortes de prensa..."
                className="flex-1"
              />
              <Button type="submit" disabled={isSearching}>
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
          </form>
          
          {searchResults.length > 0 && (
            <div className="space-y-4 mt-6">
              <h4 className="font-medium">Resultados de búsqueda ({searchResults.length})</h4>
              <div className="grid grid-cols-1 gap-4">
                {searchResults.map((clipping) => (
                  <PressClippingCard
                    key={clipping.id}
                    id={clipping.id}
                    title={clipping.title}
                    content={clipping.content}
                    category={clipping.category}
                    pageNumber={clipping.page_number}
                    summary={clipping.summary_who ? {
                      who: clipping.summary_who,
                      what: clipping.summary_what || '',
                      when: clipping.summary_when || '',
                      where: clipping.summary_where || '',
                      why: clipping.summary_why || ''
                    } : undefined}
                    keywords={clipping.keywords}
                    clientRelevance={clipping.client_relevance}
                    publicationName={clipping.publication_name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchClippingsSection;
