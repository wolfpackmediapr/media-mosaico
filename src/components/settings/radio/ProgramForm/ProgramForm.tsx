
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ProgramFormValues, programFormSchema } from "./types";
import { ProgramInfoFields } from "./ProgramInfoFields";
import { StationSelector } from "./StationSelector";
import { TimeSelectors } from "./TimeSelectors";
import { DaysSelector } from "./DaysSelector";
import { StationType } from "@/services/radio/types";

interface ProgramFormProps {
  program?: {
    id?: string;
    name: string;
    station_id: string;
    start_time: string;
    end_time: string;
    days: string[];
    host?: string;
  };
  stations: StationType[];
  onSubmit: (data: ProgramFormValues) => Promise<void>;
}

export function ProgramForm({ program, stations, onSubmit }: ProgramFormProps) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      id: program?.id || undefined,
      name: program?.name || "",
      station_id: program?.station_id || "",
      start_time: program?.start_time || "",
      end_time: program?.end_time || "",
      days: program?.days || [],
      host: program?.host || "",
    },
  });

  useEffect(() => {
    if (program) {
      form.reset({
        id: program.id,
        name: program.name,
        station_id: program.station_id,
        start_time: program.start_time,
        end_time: program.end_time,
        days: program.days,
        host: program.host,
      });
    }
  }, [program, form]);

  const handleSubmit = async (values: ProgramFormValues) => {
    await onSubmit(values);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ProgramInfoFields form={form} />
        <StationSelector form={form} stations={stations} />
        <TimeSelectors form={form} />
        <DaysSelector form={form} />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
