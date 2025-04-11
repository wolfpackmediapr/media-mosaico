
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgramType } from '@/services/radio/types';

interface ProgramSelectorProps {
  programId: string;
  programs: ProgramType[];
  loading: boolean;
  hasStation: boolean;
  onProgramChange: (programId: string) => void;
}

export const ProgramSelector = ({ programId, programs, loading, hasStation, onProgramChange }: ProgramSelectorProps) => {
  return (
    <div className="space-y-1">
      <Label htmlFor="programa">Programa</Label>
      <Select
        value={programId}
        onValueChange={onProgramChange}
        disabled={loading || !hasStation}
      >
        <SelectTrigger id="programa">
          <SelectValue placeholder={!hasStation ? "Selecciona emisora primero" : "Seleccionar programa"} />
        </SelectTrigger>
        <SelectContent>
          {programs.length > 0 ? programs.map((program) => (
            <SelectItem key={program.id} value={program.id!}>
              {program.name}
            </SelectItem>
          )) : (
            <SelectItem value="no-programs" disabled>
              {loading ? "Cargando..." : "No hay programas disponibles"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
