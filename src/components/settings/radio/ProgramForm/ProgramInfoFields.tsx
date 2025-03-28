
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ProgramFormValues } from "./types";

interface ProgramInfoFieldsProps {
  form: UseFormReturn<ProgramFormValues>;
}

export function ProgramInfoFields({ form }: ProgramInfoFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ej: Normando en la Mañana" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="host"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Locutor</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Ej: Normando Valentín" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
