
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFilterProps {
  roles: string[];
  selectedRole: string | null;
  onRoleChange: (role: string | null) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function UserFilter({
  roles,
  selectedRole,
  onRoleChange,
  searchTerm,
  onSearchChange,
}: UserFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-1">
      <div className="w-full sm:w-auto sm:min-w-[220px]">
        <Select
          value={selectedRole || "all"}
          onValueChange={(value) =>
            onRoleChange(value === "all" ? null : value)
          }
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

      <div className="flex-1">
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
