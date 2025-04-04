
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface CategoriaFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function CategoriaFilter({
  searchTerm,
  onSearchChange
}: CategoriaFilterProps) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar por nombre..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
