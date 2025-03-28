
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useEffect } from "react";
import { ProgramFormProps, ProgramFormValues, programFormSchema } from "./types";
import { StationSelector } from "./StationSelector";
import { TimeSelectors } from "./TimeSelectors";
import { DaysSelector } from "./DaysSelector";
import { ProgramInfoFields } from "./ProgramInfoFields";

export function ProgramForm({ program, stations, onSubmit }: ProgramFormProps) {
  console.log("ProgramForm received stations:", stations);
  
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      id: program?.id || "",
      name: program?.name || "",
      station_id: program?.station_id || "",
      start_time: program?.start_time || "08:00",
      end_time: program?.end_time || "10:00",
      days: program?.days || [],
      host: program?.host || "",
    },
  });

  // Update form when program changes
  useEffect(() => {
    if (program) {
      form.reset({
        id: program.id || "",
        name: program.name,
        station_id: program.station_id,
        start_time: program.start_time,
        end_time: program.end_time,
        days: program.days,
        host: program.host || "",
      });
    }
  }, [program, form]);

  const handleSubmit = async (values: ProgramFormValues) => {
    try {
      await onSubmit(values);
      if (!program) {
        form.reset({
          id: "",
          name: "",
          station_id: "",
          start_time: "08:00",
          end_time: "10:00",
          days: [],
          host: "",
        });
      }
    } catch (error) {
      console.error("Error submitting program form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ProgramInfoFields form={form} />
        
        <StationSelector form={form} stations={stations} />
        
        <TimeSelectors form={form} />
        
        <DaysSelector form={form} />

        <div className="flex justify-end">
          <Button type="submit">
            {program ? "Actualizar" : "Crear"} Programa
          </Button>
        </div>
      </form>
    </Form>
  );
}
