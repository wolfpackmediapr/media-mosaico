
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioRateType, StationType, ProgramType } from "@/services/radio/types";
import { RadioRateFormContent } from "./form/RadioRateFormContent";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface RadioRateFormProps {
  stations: StationType[];
  programs: ProgramType[];
  onCancel: () => void;
  onSave: (rate: Omit<RadioRateType, 'id' | 'created_at'>) => void;
  editMode?: boolean;
  data?: RadioRateType;
}

export function RadioRateForm({ stations, programs, onCancel, onSave, editMode = false, data }: RadioRateFormProps) {
  const [stationId, setStationId] = useState<string>("");
  const [programId, setProgramId] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("07:00");
  const [endTime, setEndTime] = useState<string>("09:00");
  const [days, setDays] = useState<Record<string, boolean>>({
    L: true, K: true, M: true, J: true, V: true, S: false, D: false
  });
  const [rate15s, setRate15s] = useState<string>("");
  const [rate30s, setRate30s] = useState<string>("");
  const [rate45s, setRate45s] = useState<string>("");
  const [rate60s, setRate60s] = useState<string>("");
  
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramType[]>([]);
  const [stationName, setStationName] = useState<string>("");
  const [programName, setProgramName] = useState<string>("");

  // Initialize form with edit data if in edit mode
  useEffect(() => {
    if (editMode && data) {
      setStationId(data.station_id);
      setProgramId(data.program_id);
      setStartTime(data.start_time);
      setEndTime(data.end_time);
      
      const daysMapping: Record<string, boolean> = {
        L: false, K: false, M: false, J: false, V: false, S: false, D: false
      };
      data.days.forEach(day => {
        daysMapping[day] = true;
      });
      setDays(daysMapping);
      
      setRate15s(data.rate_15s !== null ? data.rate_15s.toString() : "");
      setRate30s(data.rate_30s !== null ? data.rate_30s.toString() : "");
      setRate45s(data.rate_45s !== null ? data.rate_45s.toString() : "");
      setRate60s(data.rate_60s !== null ? data.rate_60s.toString() : "");
    }
  }, [editMode, data]);

  // Filter programs by selected station
  useEffect(() => {
    if (stationId) {
      setFilteredPrograms(programs.filter(program => program.station_id === stationId));
      const station = stations.find(s => s.id === stationId);
      setStationName(station?.name || "");
    } else {
      setFilteredPrograms([]);
      setStationName("");
    }
  }, [stationId, programs, stations]);

  // Update program name when programId changes
  useEffect(() => {
    if (programId) {
      const program = programs.find(p => p.id === programId);
      setProgramName(program?.name || "");
    } else {
      setProgramName("");
    }
  }, [programId, programs]);

  const handleDayToggle = (day: string, checked: boolean) => {
    setDays({...days, [day]: checked});
  };

  const handleSubmit = () => {
    const selectedDays = Object.entries(days)
      .filter(([_, isSelected]) => isSelected)
      .map(([day]) => day);

    if (!stationId || !programId || selectedDays.length === 0) {
      alert("Por favor, complete todos los campos obligatorios");
      return;
    }

    const rateData: Omit<RadioRateType, 'id' | 'created_at'> = {
      station_id: stationId,
      station_name: stationName,
      program_id: programId,
      program_name: programName,
      days: selectedDays,
      start_time: startTime,
      end_time: endTime,
      rate_15s: rate15s ? Number(rate15s) : null,
      rate_30s: rate30s ? Number(rate30s) : null,
      rate_45s: rate45s ? Number(rate45s) : null,
      rate_60s: rate60s ? Number(rate60s) : null,
      updated_at: new Date().toISOString()
    };

    if (editMode && data) {
      onSave({
        ...rateData,
        id: data.id
      } as any);
    } else {
      onSave(rateData);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{editMode ? "Editar Tarifa" : "Agregar Nueva Tarifa"}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioRateFormContent 
          stationId={stationId}
          programId={programId}
          startTime={startTime}
          endTime={endTime}
          days={days}
          rate15s={rate15s}
          rate30s={rate30s}
          rate45s={rate45s}
          rate60s={rate60s}
          stations={stations}
          filteredPrograms={filteredPrograms}
          onStationChange={setStationId}
          onProgramChange={setProgramId}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onDayToggle={handleDayToggle}
          onRate15sChange={setRate15s}
          onRate30sChange={setRate30s}
          onRate45sChange={setRate45s}
          onRate60sChange={setRate60s}
        />
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          {editMode ? "Actualizar Tarifa" : "Guardar Tarifa"}
        </Button>
      </CardFooter>
    </Card>
  );
}
