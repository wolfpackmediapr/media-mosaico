// This component is now deprecated in favor of RatesFilter
// Keeping it for backward compatibility but should be removed in future

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface RatesSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleShowAll: () => void;
}

export function RatesSearch({ searchTerm, setSearchTerm, handleShowAll }: RatesSearchProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-64 space-y-1.5">
        <Label htmlFor="search-rate">TARIFA</Label>
        <div className="relative">
          <Input
            id="search-rate"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tarifa..."
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <Button onClick={() => setSearchTerm(searchTerm)} size="sm" variant="secondary">
          Buscar
        </Button>
        <Button onClick={handleShowAll} size="sm" variant="outline">
          Mostrar todo
        </Button>
      </div>
    </div>
  );
}
