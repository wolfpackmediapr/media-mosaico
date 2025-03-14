
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface UserFilterProps {
  roles: string[];
  selectedRole: string | null;
  onRoleChange: (role: string | null) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClearFilters: () => void;
}

export function UserFilter({ 
  roles,
  selectedRole,
  onRoleChange,
  searchTerm,
  onSearchChange,
  onClearFilters
}: UserFilterProps) {
  const hasFilters = !!selectedRole || !!searchTerm;

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por nombre o correo..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <Select
        value={selectedRole || ""}
        onValueChange={(value) => onRoleChange(value || null)}
      >
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="Filtrar por rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos los roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role === "administrator" ? "Administrador" : "Entrada de datos"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {hasFilters && (
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="md:ml-2"
        >
          <X className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
