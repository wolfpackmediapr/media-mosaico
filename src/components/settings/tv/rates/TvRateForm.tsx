
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChannelType, ProgramType, TvRateType } from "@/services/tv/types";
import { formatTimeString, timeStringToDate } from "@/utils/date-utils";

export interface TvRateFormProps {
  channels: ChannelType[];
  programs: ProgramType[];
  onSave: (rateData: Omit<TvRateType, "created_at" | "channel_name" | "program_name">) => Promise<void>;
  onCancel: () => void;
  editMode?: boolean;
  data?: TvRateType;
}

const DAYS = [
  { label: "Lunes", value: "Mon" },
  { label: "Martes", value: "Tue" },
  { label: "Miércoles", value: "Wed" },
  { label: "Jueves", value: "Thu" },
  { label: "Viernes", value: "Fri" },
  { label: "Sábado", value: "Sat" },
  { label: "Domingo", value: "Sun" },
];

export function TvRateForm({ 
  channels, 
  programs, 
  onSave, 
  onCancel, 
  editMode = false,
  data 
}: TvRateFormProps) {
  const [channelId, setChannelId] = useState<string>(data?.channel_id || "");
  const [programId, setProgramId] = useState<string>(data?.program_id || "");
  const [selectedDays, setSelectedDays] = useState<string[]>(data?.days || []);
  const [startTime, setStartTime] = useState<string>(data?.start_time || "08:00");
  const [endTime, setEndTime] = useState<string>(data?.end_time || "09:00");
  const [rate15s, setRate15s] = useState<string>(data?.rate_15s?.toString() || "");
  const [rate30s, setRate30s] = useState<string>(data?.rate_30s?.toString() || "");
  const [rate45s, setRate45s] = useState<string>(data?.rate_45s?.toString() || "");
  const [rate60s, setRate60s] = useState<string>(data?.rate_60s?.toString() || "");
  
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter programs by channel
  useEffect(() => {
    if (channelId) {
      const filtered = programs.filter(p => p.channel_id === channelId);
      setFilteredPrograms(filtered);
      
      // If the current program doesn't belong to the selected channel, reset it
      if (programId && !filtered.find(p => p.id === programId)) {
        setProgramId("");
      }
    } else {
      setFilteredPrograms([]);
      setProgramId("");
    }
  }, [channelId, programs, programId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelId || !programId || selectedDays.length === 0) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse numeric values
      const rateData: Omit<TvRateType, "created_at" | "channel_name" | "program_name"> = {
        id: data?.id || crypto.randomUUID(),
        channel_id: channelId,
        program_id: programId,
        days: selectedDays,
        start_time: startTime,
        end_time: endTime,
        rate_15s: rate15s ? parseFloat(rate15s) : null,
        rate_30s: rate30s ? parseFloat(rate30s) : null,
        rate_45s: rate45s ? parseFloat(rate45s) : null,
        rate_60s: rate60s ? parseFloat(rate60s) : null
      };

      await onSave(rateData);
    } catch (error) {
      console.error("Error saving TV rate:", error);
      alert("Error al guardar la tarifa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day) 
        : [...prev, day]
    );
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select
                value={channelId}
                onValueChange={setChannelId}
              >
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program">Programa</Label>
              <Select
                value={programId}
                onValueChange={setProgramId}
                disabled={!channelId}
              >
                <SelectTrigger id="program">
                  <SelectValue placeholder={channelId ? "Seleccionar programa" : "Seleccione un canal primero"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map(program => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de fin</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="font-normal">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate15s">Tarifa 15s ($)</Label>
              <Input
                id="rate15s"
                type="number"
                min="0"
                step="0.01"
                value={rate15s}
                onChange={(e) => setRate15s(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate30s">Tarifa 30s ($)</Label>
              <Input
                id="rate30s"
                type="number"
                min="0"
                step="0.01"
                value={rate30s}
                onChange={(e) => setRate30s(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate45s">Tarifa 45s ($)</Label>
              <Input
                id="rate45s"
                type="number"
                min="0"
                step="0.01"
                value={rate45s}
                onChange={(e) => setRate45s(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate60s">Tarifa 60s ($)</Label>
              <Input
                id="rate60s"
                type="number"
                min="0"
                step="0.01"
                value={rate60s}
                onChange={(e) => setRate60s(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !channelId || !programId || selectedDays.length === 0}
            >
              {isSubmitting ? "Guardando..." : editMode ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
