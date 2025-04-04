
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ParticipantCategoryType } from "@/services/participantes/types";
import { Search } from "lucide-react";

interface ParticipanteFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: ParticipantCategoryType[];
}

export function ParticipanteFilter({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories
}: ParticipanteFilterProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o cargo..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <Select
        value={selectedCategory}
        onValueChange={onCategoryChange}
      >
        <SelectTrigger className="w-full md:w-[200px]">
          <SelectValue placeholder="Todas las categorías" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las categorías</SelectItem>
          {categories
            .filter(category => category && category.id && category.name && category.name.trim() !== '')
            .map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
