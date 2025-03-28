
import { z } from "zod";
import { ProgramType, StationType } from "@/services/radio/types";

export const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const programFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  station_id: z.string().min(1, "La estación es requerida"),
  start_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)"),
  end_time: z.string().regex(timeRegex, "Formato de hora inválido (HH:MM)"),
  days: z.array(z.string()).min(1, "Selecciona al menos un día"),
  host: z.string().optional(),
});

export type ProgramFormValues = z.infer<typeof programFormSchema>;

export interface ProgramFormProps {
  program?: ProgramType;
  stations: StationType[];
  onSubmit: (data: ProgramFormValues) => Promise<void>;
}
