
import { Button } from "@/components/ui/button";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface GenresHeaderProps {
  onAddClick: () => void;
}

export function GenresHeader({ onAddClick }: GenresHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Géneros Periodísticos</CardTitle>
        <CardDescription>
          Administra los géneros periodísticos disponibles en el sistema
        </CardDescription>
      </div>
      <Button onClick={onAddClick} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Agregar género
      </Button>
    </div>
  );
}
