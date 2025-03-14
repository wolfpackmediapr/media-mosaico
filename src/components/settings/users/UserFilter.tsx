
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  onClearFilters,
}: UserFilterProps) {
  const hasFilters = !!selectedRole || !!searchTerm;

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
      <div className="w-full md:w-1/3">
        <Input
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="w-full md:w-1/4">
        <Select
          value={selectedRole || ""}
          onValueChange={(value) => onRoleChange(value === "" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role === "administrator" ? "Administrador" : "Entrada de datos"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="flex items-center">
          <X className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
