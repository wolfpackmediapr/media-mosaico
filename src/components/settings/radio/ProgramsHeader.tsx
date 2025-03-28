
import { Button } from "@/components/ui/button";
import { 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";

interface ProgramsHeaderProps {
  onAddProgram: () => void;
}

export function ProgramsHeader({ onAddProgram }: ProgramsHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Programas de Radio</CardTitle>
        <Button onClick={onAddProgram}>Añadir Programa</Button>
      </div>
      <CardDescription>
        Administra los programas de radio disponibles en el sistema
      </CardDescription>
    </CardHeader>
  );
}
