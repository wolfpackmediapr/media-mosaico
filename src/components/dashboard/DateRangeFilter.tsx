import React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardDate, DatePreset } from "@/contexts/DashboardDateContext";

const presetLabels: Record<DatePreset, string> = {
  today: 'Hoy',
  '7days': 'Últimos 7 días',
  '30days': 'Últimos 30 días',
  thisWeek: 'Esta semana',
  thisMonth: 'Este mes',
  custom: 'Personalizado',
};

export function DateRangeFilter() {
  const { dateRange, setDateRange, setPreset } = useDashboardDate();

  const handlePresetChange = (value: DatePreset) => {
    setPreset(value);
  };

  const handleFromDateChange = (date: Date | undefined) => {
    setDateRange({
      ...dateRange,
      from: date,
      preset: 'custom',
    });
  };

  const handleToDateChange = (date: Date | undefined) => {
    setDateRange({
      ...dateRange,
      to: date,
      preset: 'custom',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={dateRange.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Seleccionar período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoy</SelectItem>
          <SelectItem value="7days">Últimos 7 días</SelectItem>
          <SelectItem value="30days">Últimos 30 días</SelectItem>
          <SelectItem value="thisWeek">Esta semana</SelectItem>
          <SelectItem value="thisMonth">Este mes</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {dateRange.preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  format(dateRange.from, "dd/MM/yyyy", { locale: es })
                ) : (
                  <span>Desde</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={handleFromDateChange}
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
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? (
                  format(dateRange.to, "dd/MM/yyyy", { locale: es })
                ) : (
                  <span>Hasta</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={handleToDateChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {dateRange.preset !== 'custom' && dateRange.from && dateRange.to && (
        <span className="text-sm text-muted-foreground">
          {format(dateRange.from, "dd/MM", { locale: es })} - {format(dateRange.to, "dd/MM", { locale: es })}
        </span>
      )}
    </div>
  );
}
