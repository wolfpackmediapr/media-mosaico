
import { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StationType } from '@/services/radio/types';

interface StationSelectorProps {
  stationId: string;
  stations: StationType[];
  loading: boolean;
  onStationChange: (stationId: string) => void;
}

export const StationSelector = ({ stationId, stations, loading, onStationChange }: StationSelectorProps) => {
  return (
    <div className="space-y-1">
      <Label htmlFor="emisora">Emisora</Label>
      <Select
        value={stationId}
        onValueChange={onStationChange}
        disabled={loading}
      >
        <SelectTrigger id="emisora">
          <SelectValue placeholder="Seleccionar emisora" />
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
};
