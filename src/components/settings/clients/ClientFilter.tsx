
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, Search } from "lucide-react";

export interface ClientFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function ClientFilter({
  categories,
  selectedCategory,
  onCategoryChange,
  searchTerm,
  onSearchChange
}: ClientFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar clientes..."
          className="pl-8 w-full sm:w-[200px]"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <Select
        value={selectedCategory || "all"}
        onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          <SelectGroup>
            <SelectLabel>Categorías</SelectLabel>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "GOBIERNO" ? "Gobierno" :
                 category === "EMPRESA" ? "Empresa" :
                 category === "ONG" ? "ONG" :
                 category === "EDUCACION" ? "Educación" :
                 category === "SALUD" ? "Salud" :
                 category === "OTRO" ? "Otro" : category}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
