
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
import { Filter } from "lucide-react";

interface ClientFilterProps {
  filterCategory: string;
  onFilterChange: (category: string) => void;
  showFilter: boolean;
  onToggleFilter: () => void;
}

export function ClientFilter({
  filterCategory,
  onFilterChange,
  showFilter,
  onToggleFilter
}: ClientFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFilter}
        className={showFilter ? "bg-muted" : ""}
      >
        <Filter className="h-4 w-4 mr-1" />
        Filtrar
      </Button>
      
      {showFilter && (
        <Select
          value={filterCategory}
          onValueChange={onFilterChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las categorías</SelectItem>
            <SelectGroup>
              <SelectLabel>Categorías</SelectLabel>
              <SelectItem value="GOBIERNO">Gobierno</SelectItem>
              <SelectItem value="EMPRESA">Empresa</SelectItem>
              <SelectItem value="ONG">ONG</SelectItem>
              <SelectItem value="EDUCACION">Educación</SelectItem>
              <SelectItem value="SALUD">Salud</SelectItem>
              <SelectItem value="OTRO">Otro</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
