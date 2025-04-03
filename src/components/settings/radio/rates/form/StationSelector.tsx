
import { Label } from "@/components/ui/label";
import { StationType } from "@/services/radio/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StationSelectorProps {
  stationId: string;
  stations: StationType[];
  onStationChange: (stationId: string) => void;
}

export function StationSelector({ stationId, stations, onStationChange }: StationSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="station">Medio *</Label>
      <Select 
        value={stationId} 
        onValueChange={onStationChange}
      >
        <SelectTrigger id="station">
          <SelectValue placeholder="Seleccionar medio" />
        </SelectTrigger>
        <SelectContent>
          {stations.map((station) => (
            <SelectItem key={station.id} value={station.id}>
              {station.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
