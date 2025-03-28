
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ProgramFormValues } from "./types";

interface TimeSelectorsProps {
  form: UseFormReturn<ProgramFormValues>;
}

export function TimeSelectors({ form }: TimeSelectorsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="start_time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hora Inicio</FormLabel>
            <FormControl>
              <Input {...field} placeholder="HH:MM" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="end_time"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hora Fin</FormLabel>
            <FormControl>
              <Input {...field} placeholder="HH:MM" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
