
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
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter?: "active" | "inactive" | "all";
  onStatusChange?: (status: "active" | "inactive" | "all") => void;
  clientCategories?: { id: string; name: string; subcategories?: { id: string; name: string }[] }[];
  selectedClientCategory: string | null;
  onClientCategoryChange: (id: string | null) => void;
  selectedClientSubcategory: string | null;
  onClientSubcategoryChange: (id: string | null) => void;
}

export function ClientFilter({
  searchTerm,
  onSearchChange,
  statusFilter = "active",
  onStatusChange,
  clientCategories = [],
  selectedClientCategory,
  onClientCategoryChange,
  selectedClientSubcategory,
  onClientSubcategoryChange,
}: ClientFilterProps) {
  const subcategories =
    selectedClientCategory && selectedClientCategory !== "none"
      ? clientCategories.find((c) => c.id === selectedClientCategory)?.subcategories ?? []
      : [];

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre, subcategoría o palabra clave..."
          className="pl-8 w-full sm:w-[200px]"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <Select
        value={selectedClientCategory || "all"}
        onValueChange={(value) => onClientCategoryChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="all">Todas las categorías</SelectItem>
          <SelectItem value="none">Sin categoría asignada</SelectItem>
          <SelectGroup>
            <SelectLabel>Categorías de Clientes</SelectLabel>
            {clientCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {subcategories.length > 0 && (
        <Select
          value={selectedClientSubcategory || "all"}
          onValueChange={(value) => onClientSubcategoryChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todas las subcategorías" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todas las subcategorías</SelectItem>
            {subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onStatusChange && (
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as "active" | "inactive" | "all")}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
