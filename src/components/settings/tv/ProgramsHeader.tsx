
import { Button } from "@/components/ui/button";
import { CardTitle, CardDescription } from "@/components/ui/card";

interface ProgramsHeaderProps {
  onAddClick: () => void;
  isDisabled: boolean;
}

export function ProgramsHeader({ onAddClick, isDisabled }: ProgramsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Programas de Televisión</CardTitle>
        <CardDescription>
          Administra los programas de televisión disponibles en el sistema
        </CardDescription>
      </div>
      <Button 
        onClick={onAddClick}
        disabled={isDisabled}
      >
        Añadir Programa
      </Button>
    </div>
  );
}
