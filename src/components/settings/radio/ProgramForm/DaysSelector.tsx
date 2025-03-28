
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { ProgramFormValues } from "./types";

interface DaysSelectorProps {
  form: UseFormReturn<ProgramFormValues>;
}

const weekdays = [
  { id: "Mon", label: "Lunes" },
  { id: "Tue", label: "Martes" },
  { id: "Wed", label: "Miércoles" },
  { id: "Thu", label: "Jueves" },
  { id: "Fri", label: "Viernes" },
  { id: "Sat", label: "Sábado" },
  { id: "Sun", label: "Domingo" },
];

export function DaysSelector({ form }: DaysSelectorProps) {
  const setDays = (days: string[]) => {
    form.setValue("days", days);
  };

  return (
    <FormField
      control={form.control}
      name="days"
      render={() => (
        <FormItem>
          <div className="mb-4">
            <FormLabel>Días</FormLabel>
            <div className="flex space-x-2 mt-1">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setDays(["Mon", "Tue", "Wed", "Thu", "Fri"])}
              >
                Lun-Vie
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setDays(["Sat", "Sun"])}
              >
                Fin de semana
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])}
              >
                Todos
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {weekdays.map((day) => (
              <FormField
                key={day.id}
                control={form.control}
                name="days"
                render={({ field }) => {
                  return (
                    <FormItem
                      key={day.id}
                      className="flex flex-row items-start space-x-2 space-y-0"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(day.id)}
                          onCheckedChange={(checked) => {
                            const currentDays = field.value || [];
                            const updatedDays = checked
                              ? [...currentDays, day.id]
                              : currentDays.filter((d) => d !== day.id);
                            field.onChange(updatedDays);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {day.label}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
