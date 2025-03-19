
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface PrensaSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedOutlet: string;
  onOutletChange: (value: string) => void;
  outlets: Array<{ id: string, name: string }>;
}

const PrensaSearch = ({ 
  searchTerm, 
  onSearchChange,
  selectedOutlet,
  onOutletChange,
  outlets = [] 
}: PrensaSearchProps) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por título, categoría, cliente o palabra clave..."
          className="pl-10 w-full"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {outlets.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar por medio:</span>
          <Select value={selectedOutlet} onValueChange={onOutletChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los medios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los medios</SelectItem>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default PrensaSearch;
