import React from "react";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AlertsDatePreset =
  | "today"
  | "7days"
  | "30days"
  | "90days"
  | "6months"
  | "custom";

export interface AlertsDateRange {
  from?: Date;
  to?: Date;
  preset: AlertsDatePreset;
}

export function resolveAlertsPreset(preset: AlertsDatePreset): {
  from?: Date;
  to?: Date;
} {
  const now = new Date();
  const to = endOfDay(now);
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to };
    case "7days":
      return { from: startOfDay(subDays(now, 6)), to };
    case "30days":
      return { from: startOfDay(subDays(now, 29)), to };
    case "90days":
      return { from: startOfDay(subDays(now, 89)), to };
    case "6months":
      return { from: startOfDay(subMonths(now, 6)), to };
    case "custom":
      return {};
  }
}

interface Props {
  value: AlertsDateRange;
  onChange: (v: AlertsDateRange) => void;
}

export function AlertsDateRangePicker({ value, onChange }: Props) {
  const handlePreset = (preset: AlertsDatePreset) => {
    if (preset === "custom") {
      onChange({ ...value, preset });
      return;
    }
    const { from, to } = resolveAlertsPreset(preset);
    onChange({ preset, from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.preset} onValueChange={(v) => handlePreset(v as AlertsDatePreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="7days">Últimos 7 días</SelectItem>
          <SelectItem value="30days">Últimos 30 días</SelectItem>
          <SelectItem value="90days">Últimos 90 días</SelectItem>
          <SelectItem value="6months">Últimos 6 meses</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !value.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.from ? format(value.from, "dd/MM/yyyy", { locale: es }) : <span>Desde</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.from}
                onSelect={(d) =>
                  onChange({ ...value, preset: "custom", from: d ? startOfDay(d) : undefined })
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">-</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !value.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.to ? format(value.to, "dd/MM/yyyy", { locale: es }) : <span>Hasta</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.to}
                onSelect={(d) =>
                  onChange({ ...value, preset: "custom", to: d ? endOfDay(d) : undefined })
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {value.preset !== "custom" && value.from && value.to && (
        <span className="text-sm text-muted-foreground">
          {format(value.from, "dd/MM/yyyy", { locale: es })} —{" "}
          {format(value.to, "dd/MM/yyyy", { locale: es })}
        </span>
      )}
    </div>
  );
}