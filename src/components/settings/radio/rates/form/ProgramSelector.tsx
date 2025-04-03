
import { Label } from "@/components/ui/label";
import { ProgramType } from "@/services/radio/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProgramSelectorProps {
  programId: string;
  programs: ProgramType[];
  onProgramChange: (programId: string) => void;
  disabled?: boolean;
}

export function ProgramSelector({ programId, programs, onProgramChange, disabled = false }: ProgramSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="program">Programa *</Label>
      <Select 
        value={programId} 
        onValueChange={onProgramChange}
        disabled={disabled}
      >
        <SelectTrigger id="program">
          <SelectValue placeholder="Seleccionar programa" />
        </SelectTrigger>
        <SelectContent>
          {programs.map((program) => (
            <SelectItem key={program.id} value={program.id!}>
              {program.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
