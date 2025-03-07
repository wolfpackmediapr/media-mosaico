
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface PrensaSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const PrensaSearch = ({ searchTerm, onSearchChange }: PrensaSearchProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Buscar por título, categoría, cliente o palabra clave..."
        className="pl-10 w-full"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
};

export default PrensaSearch;
