
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface TvRateFormProps {
  channels: ChannelType[];
  programs: ProgramType[];
  onSave: (rateData: Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>) => void;
  onCancel: () => void;
  initialData?: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>;
}

const weekdays = [
  { id: "monday", label: "Lunes", short: "L" },
  { id: "tuesday", label: "Martes", short: "K" },
  { id: "wednesday", label: "Miércoles", short: "M" },
  { id: "thursday", label: "Jueves", short: "J" },
  { id: "friday", label: "Viernes", short: "V" },
  { id: "saturday", label: "Sábado", short: "S" },
  { id: "sunday", label: "Domingo", short: "D" },
];

export function TvRateForm({
  channels,
  programs,
  onSave,
  onCancel,
  initialData,
}: TvRateFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>>({
    channel_id: initialData?.channel_id || '',
    program_id: initialData?.program_id || '',
    days: initialData?.days || [],
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    rate_15s: initialData?.rate_15s || null,
    rate_30s: initialData?.rate_30s || null,
    rate_45s: initialData?.rate_45s || null,
    rate_60s: initialData?.rate_60s || null,
  });

  const [filteredPrograms, setFilteredPrograms] = useState<ProgramType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update filtered programs when channel changes
  useEffect(() => {
    if (formData.channel_id) {
      const channelPrograms = programs.filter(
        (program) => program.channel_id === formData.channel_id
      );
      setFilteredPrograms(channelPrograms);
      
      // If current selected program isn't from this channel, reset it
      if (formData.program_id && !channelPrograms.some(p => p.id === formData.program_id)) {
        setFormData(prev => ({ ...prev, program_id: '' }));
      }
    } else {
      setFilteredPrograms([]);
    }
  }, [formData.channel_id, programs]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.channel_id) {
      newErrors.channel_id = "El canal es requerido";
    }

    if (!formData.program_id) {
      newErrors.program_id = "El programa es requerido";
    }

    if (formData.days.length === 0) {
      newErrors.days = "Al menos un día es requerido";
    }

    if (!formData.start_time) {
      newErrors.start_time = "La hora de inicio es requerida";
    }

    if (!formData.end_time) {
      newErrors.end_time = "La hora de fin es requerida";
    }

    // All rates can't be empty/null
    if (
      formData.rate_15s === null &&
      formData.rate_30s === null &&
      formData.rate_45s === null &&
      formData.rate_60s === null
    ) {
      newErrors.rates = "Al menos una tarifa es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (isEditing && initialData) {
        onSave({
          id: initialData.id,
          ...formData
        });
      } else {
        onSave(formData);
      }
    }
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const currentDays = [...prev.days];
      if (currentDays.includes(day)) {
        return { ...prev, days: currentDays.filter((d) => d !== day) };
      } else {
        return { ...prev, days: [...currentDays, day] };
      }
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // For rate fields, handle empty strings as null
    if (name.startsWith('rate_') && value === '') {
      setFormData((prev) => ({ ...prev, [name]: null }));
    } else if (name.startsWith('rate_')) {
      const numValue = parseFloat(value);
      setFormData((prev) => ({ 
        ...prev, 
        [name]: isNaN(numValue) ? null : numValue
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {isEditing ? "Editar tarifa" : "Agregar nueva tarifa"}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            title="Cancelar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel_id">Canal</Label>
              <Select
                value={formData.channel_id}
                onValueChange={(value) => handleSelectChange("channel_id", value)}
                disabled={isEditing}
              >
                <SelectTrigger id="channel_id">
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.channel_id && (
                <p className="text-sm text-red-500">{errors.channel_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="program_id">Programa</Label>
              <Select
                value={formData.program_id}
                onValueChange={(value) => handleSelectChange("program_id", value)}
                disabled={!formData.channel_id || isEditing}
              >
                <SelectTrigger id="program_id">
                  <SelectValue placeholder={formData.channel_id ? "Seleccionar programa" : "Primero seleccione un canal"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.program_id && (
                <p className="text-sm text-red-500">{errors.program_id}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días</Label>
            <div className="flex flex-wrap gap-4">
              {weekdays.map((day) => (
                <div key={day.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={formData.days.includes(day.id)}
                    onCheckedChange={() => handleDayToggle(day.id)}
                  />
                  <Label
                    htmlFor={`day-${day.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
            {errors.days && (
              <p className="text-sm text-red-500">{errors.days}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora de inicio</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                value={formData.start_time}
                onChange={handleChange}
              />
              {errors.start_time && (
                <p className="text-sm text-red-500">{errors.start_time}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">Hora de fin</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                value={formData.end_time}
                onChange={handleChange}
              />
              {errors.end_time && (
                <p className="text-sm text-red-500">{errors.end_time}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tarifas</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="rate_15s" className="text-sm">15 segundos</Label>
                <Input
                  id="rate_15s"
                  name="rate_15s"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional"
                  value={formData.rate_15s === null ? '' : formData.rate_15s}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="rate_30s" className="text-sm">30 segundos</Label>
                <Input
                  id="rate_30s"
                  name="rate_30s"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional"
                  value={formData.rate_30s === null ? '' : formData.rate_30s}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="rate_45s" className="text-sm">45 segundos</Label>
                <Input
                  id="rate_45s"
                  name="rate_45s"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional"
                  value={formData.rate_45s === null ? '' : formData.rate_45s}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="rate_60s" className="text-sm">60 segundos</Label>
                <Input
                  id="rate_60s"
                  name="rate_60s"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional"
                  value={formData.rate_60s === null ? '' : formData.rate_60s}
                  onChange={handleChange}
                />
              </div>
            </div>
            {errors.rates && (
              <p className="text-sm text-red-500">{errors.rates}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
