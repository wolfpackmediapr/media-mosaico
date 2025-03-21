
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MediaSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

export function MediaSearch({ 
  searchTerm, 
  onSearchChange,
  placeholder = "Buscar por nombre o tipo..."
}: MediaSearchProps) {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 w-full"
        aria-label="Buscar medios"
      />
    </div>
  );
}
