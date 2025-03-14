
import { useState } from "react";
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
  
  return (
    <>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={onToggleFilter} 
        className="flex items-center gap-1"
      >
        {showFilter ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
        <span>{showFilter ? 'Limpiar filtro' : 'Filtrar'}</span>
      </Button>
      
      {showFilter && (
        <div className="mb-6 p-4 bg-muted/40 rounded-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-type" className="text-right">
                Tipo de medio
              </Label>
              <Select 
                value={filterType} 
                onValueChange={onFilterChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="tv">Televisión</SelectItem>
                  <SelectItem value="radio">Radio</SelectItem>
                  <SelectItem value="prensa">Prensa Digital</SelectItem>
                  <SelectItem value="prensa_escrita">Prensa Escrita</SelectItem>
                  <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
