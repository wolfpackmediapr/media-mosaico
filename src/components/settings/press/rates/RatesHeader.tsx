
import { Button } from "@/components/ui/button";
import { CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface RatesHeaderProps {
  onAddClick: () => void;
}

export function RatesHeader({ onAddClick }: RatesHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Tarifas de Prensa</CardTitle>
        <CardDescription>
          Administra las tarifas disponibles para medios de prensa
        </CardDescription>
      </div>
      <Button onClick={onAddClick} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Agregar tarifa
      </Button>
    </div>
  );
}
