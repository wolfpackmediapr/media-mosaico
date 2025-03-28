
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { ProgramFormValues } from "./types";
import { StationType } from "@/services/radio/types";

interface StationSelectorProps {
  form: UseFormReturn<ProgramFormValues>;
  stations: StationType[];
}

export function StationSelector({ form, stations }: StationSelectorProps) {
  console.log("StationSelector received stations:", stations);
  
  return (
    <FormField
      control={form.control}
      name="station_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Estación</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una estación" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {stations && stations.length > 0 ? (
                stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name} ({station.code})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>
                  No hay estaciones disponibles
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
