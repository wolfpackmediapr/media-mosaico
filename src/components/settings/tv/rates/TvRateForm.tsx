
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/date-picker";
import { TvRateType } from "@/services/tv/types";
import { ChannelType, ProgramType } from "@/services/tv/types";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { formatTime } from "@/utils/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const dayOptions = [
  { id: 'L', label: 'Lunes' },
  { id: 'K', label: 'Martes' },
  { id: 'M', label: 'Miércoles' },
  { id: 'J', label: 'Jueves' },
  { id: 'V', label: 'Viernes' },
  { id: 'S', label: 'Sábado' },
  { id: 'D', label: 'Domingo' },
];

interface TvRateFormProps {
  onSave: (rate: Omit<TvRateType, "id" | "created_at" | "channel_name" | "program_name">) => void;
  onCancel: () => void;
  channels: ChannelType[];
  programs: ProgramType[];
  initialValues?: TvRateType;
  isEdit?: boolean;
}

export function TvRateForm({ 
  onSave, 
  onCancel, 
  channels, 
  programs,
  initialValues,
  isEdit = false
}: TvRateFormProps) {
  const [channelId, setChannelId] = useState<string>(initialValues?.channel_id || "");
  const [programId, setProgramId] = useState<string>(initialValues?.program_id || "");
  const [days, setDays] = useState<string[]>(initialValues?.days || []);
  const [startTime, setStartTime] = useState<string>(initialValues?.start_time || "");
  const [endTime, setEndTime] = useState<string>(initialValues?.end_time || "");
  const [rate15s, setRate15s] = useState<string>(initialValues?.rate_15s?.toString() || "");
  const [rate30s, setRate30s] = useState<string>(initialValues?.rate_30s?.toString() || "");
  const [rate45s, setRate45s] = useState<string>(initialValues?.rate_45s?.toString() || "");
  const [rate60s, setRate60s] = useState<string>(initialValues?.rate_60s?.toString() || "");
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramType[]>(programs);

  // Filter programs based on selected channel
  useEffect(() => {
    if (channelId) {
      setFilteredPrograms(programs.filter(program => program.channel_id === channelId));
    } else {
      setFilteredPrograms(programs);
    }
  }, [channelId, programs]);

  const handleDayToggle = (dayId: string) => {
    if (days.includes(dayId)) {
      setDays(days.filter(d => d !== dayId));
    } else {
      setDays([...days, dayId]);
    }
  };

  const handleSave = () => {
    // Basic validation
    if (!channelId || !programId || days.length === 0 || !startTime || !endTime) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    // Convert string rates to numbers or null
    const newRate: Omit<TvRateType, "id" | "created_at" | "channel_name" | "program_name"> = {
      channel_id: channelId,
      program_id: programId,
      days,
      start_time: startTime,
      end_time: endTime,
      rate_15s: rate15s ? parseFloat(rate15s) : null,
      rate_30s: rate30s ? parseFloat(rate30s) : null,
      rate_45s: rate45s ? parseFloat(rate45s) : null,
      rate_60s: rate60s ? parseFloat(rate60s) : null
    };

    onSave(newRate);
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">{isEdit ? "Editar Tarifa" : "Nueva Tarifa"}</h3>
            {isEdit && initialValues && (
              <Badge variant="outline" className="ml-2">
                ID: {initialValues.id.substring(0, 8)}...
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Channel selection */}
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select 
                value={channelId} 
                onValueChange={setChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Program selection */}
            <div className="space-y-2">
              <Label htmlFor="program">Programa</Label>
              <Select 
                value={programId} 
                onValueChange={setProgramId}
                disabled={!channelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!channelId ? "Seleccione un canal primero" : "Seleccione un programa"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Days selection */}
          <div className="space-y-2">
            <Label>Días</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {dayOptions.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`day-${day.id}`} 
                    checked={days.includes(day.id)}
                    onCheckedChange={() => handleDayToggle(day.id)}
                  />
                  <Label htmlFor={`day-${day.id}`} className="font-normal cursor-pointer">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Time range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora inicio</Label>
              <TimePicker 
                value={startTime}
                onChange={setStartTime}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora fin</Label>
              <TimePicker 
                value={endTime}
                onChange={setEndTime}
              />
            </div>
          </div>
          
          {/* Rates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate15s">Tarifa 15s</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input 
                  id="rate15s" 
                  type="number" 
                  step="0.01" 
                  value={rate15s} 
                  onChange={(e) => setRate15s(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate30s">Tarifa 30s</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input 
                  id="rate30s" 
                  type="number" 
                  step="0.01" 
                  value={rate30s} 
                  onChange={(e) => setRate30s(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate45s">Tarifa 45s</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input 
                  id="rate45s" 
                  type="number" 
                  step="0.01" 
                  value={rate45s} 
                  onChange={(e) => setRate45s(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate60s">Tarifa 60s</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input 
                  id="rate60s" 
                  type="number" 
                  step="0.01" 
                  value={rate60s} 
                  onChange={(e) => setRate60s(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              {isEdit ? "Actualizar" : "Guardar"} Tarifa
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
