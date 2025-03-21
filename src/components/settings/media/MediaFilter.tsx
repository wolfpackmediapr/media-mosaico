
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";

interface MediaFilterProps {
  filterType: string;
  onFilterChange: (type: string) => void;
  showFilter: boolean;
  onToggleFilter: () => void;
}

export function MediaFilter({ 
  filterType, 
  onFilterChange, 
  showFilter, 
  onToggleFilter 
}: MediaFilterProps) {
  const mediaTypes = [
    { value: "", label: "Todos" },
    { value: "tv", label: "Televisión" },
    { value: "radio", label: "Radio" },
    { value: "prensa", label: "Prensa Digital" },
    { value: "prensa_escrita", label: "Prensa Escrita" },
    { value: "redes_sociales", label: "Redes Sociales" }
  ];
  
  return (
    <div className="flex flex-col gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onToggleFilter} 
        className="flex items-center gap-1"
      >
        {showFilter ? (
          <>
            <X className="h-4 w-4" />
            <span>Limpiar filtro</span>
          </>
        ) : (
          <>
            <Filter className="h-4 w-4" />
            <span>Filtrar</span>
          </>
        )}
      </Button>
      
      {showFilter && (
        <div className="mt-2 p-4 bg-muted/40 rounded-md">
          <div className="flex items-center gap-4">
            <Label htmlFor="filter-type" className="min-w-24 text-sm font-medium">
              Tipo de medio:
            </Label>
            <Select 
              value={filterType} 
              onValueChange={onFilterChange}
            >
              <SelectTrigger id="filter-type" className="w-[180px]">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {mediaTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
