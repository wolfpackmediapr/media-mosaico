
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
  return (
    <FormField
      control={form.control}
      name="station_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Estación</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una estación" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {stations.map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  {station.name} ({station.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
