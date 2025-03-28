
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { StationType } from "@/services/radio/types";

interface ProgramStationFilterProps {
  stations: StationType[];
  selectedStationId: string;
  onStationChange: (stationId: string) => void;
}

export function ProgramStationFilter({ 
  stations, 
  selectedStationId, 
  onStationChange 
}: ProgramStationFilterProps) {
  return (
    <div className="flex items-end gap-4 mb-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="station-filter">Filtrar por estación</Label>
        <Select value={selectedStationId} onValueChange={onStationChange}>
          <SelectTrigger id="station-filter">
            <SelectValue placeholder="Selecciona una estación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las estaciones</SelectItem>
            {stations.map(station => (
              <SelectItem key={station.id} value={station.id}>
                {station.name} ({station.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
