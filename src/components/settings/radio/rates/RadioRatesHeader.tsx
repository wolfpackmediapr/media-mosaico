
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface RadioRatesHeaderProps {
  onAddClick: () => void;
}

export function RadioRatesHeader({ onAddClick }: RadioRatesHeaderProps) {
  return (
    <div className="flex justify-end mb-6">
      <Button onClick={onAddClick} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Agregar tarifa
      </Button>
    </div>
  );
}
