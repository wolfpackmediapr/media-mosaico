
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioRateType, StationType, ProgramType } from "@/services/radio/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onSubmit: (rate: Omit<RadioRateType, 'id' | 'created_at'>) => void;
}

export function RadioRateForm({ stations, programs, onCancel, onSubmit }: RadioRateFormProps) {
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
      rate_60s: rate60s ? Number(rate60s) : null
    };

    onSubmit(rateData);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Agregar Nueva Tarifa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="station">Medio *</Label>
            <Select 
              value={stationId} 
              onValueChange={setStationId}
            >
              <SelectTrigger id="station">
                <SelectValue placeholder="Seleccionar medio" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="program">Programa *</Label>
            <Select 
              value={programId} 
              onValueChange={setProgramId}
              disabled={!stationId}
            >
              <SelectTrigger id="program">
                <SelectValue placeholder="Seleccionar programa" />
              </SelectTrigger>
              <SelectContent>
                {filteredPrograms.map((program) => (
                  <SelectItem key={program.id} value={program.id!}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Días *</Label>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-monday" 
                  checked={days.L} 
                  onCheckedChange={(checked) => handleDayToggle('L', checked as boolean)} 
                />
                <Label htmlFor="day-monday" className="cursor-pointer">L</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-tuesday" 
                  checked={days.K} 
                  onCheckedChange={(checked) => handleDayToggle('K', checked as boolean)} 
                />
                <Label htmlFor="day-tuesday" className="cursor-pointer">M</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-wednesday" 
                  checked={days.M} 
                  onCheckedChange={(checked) => handleDayToggle('M', checked as boolean)} 
                />
                <Label htmlFor="day-wednesday" className="cursor-pointer">X</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-thursday" 
                  checked={days.J} 
                  onCheckedChange={(checked) => handleDayToggle('J', checked as boolean)} 
                />
                <Label htmlFor="day-thursday" className="cursor-pointer">J</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-friday" 
                  checked={days.V} 
                  onCheckedChange={(checked) => handleDayToggle('V', checked as boolean)} 
                />
                <Label htmlFor="day-friday" className="cursor-pointer">V</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-saturday" 
                  checked={days.S} 
                  onCheckedChange={(checked) => handleDayToggle('S', checked as boolean)} 
                />
                <Label htmlFor="day-saturday" className="cursor-pointer">S</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="day-sunday" 
                  checked={days.D} 
                  onCheckedChange={(checked) => handleDayToggle('D', checked as boolean)} 
                />
                <Label htmlFor="day-sunday" className="cursor-pointer">D</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-time">Hora Inicio *</Label>
            <Input 
              id="start-time" 
              type="time" 
              value={startTime} 
              onChange={(e) => setStartTime(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-time">Hora Fin *</Label>
            <Input 
              id="end-time" 
              type="time" 
              value={endTime} 
              onChange={(e) => setEndTime(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-15s">Tarifa 15s ($)</Label>
            <Input 
              id="rate-15s" 
              type="number" 
              value={rate15s} 
              onChange={(e) => setRate15s(e.target.value)} 
              placeholder="Precio para 15 segundos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-30s">Tarifa 30s ($)</Label>
            <Input 
              id="rate-30s" 
              type="number" 
              value={rate30s} 
              onChange={(e) => setRate30s(e.target.value)} 
              placeholder="Precio para 30 segundos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-45s">Tarifa 45s ($)</Label>
            <Input 
              id="rate-45s" 
              type="number" 
              value={rate45s} 
              onChange={(e) => setRate45s(e.target.value)} 
              placeholder="Precio para 45 segundos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-60s">Tarifa 60s ($)</Label>
            <Input 
              id="rate-60s" 
              type="number" 
              value={rate60s} 
              onChange={(e) => setRate60s(e.target.value)} 
              placeholder="Precio para 60 segundos"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          Guardar Tarifa
        </Button>
      </CardFooter>
    </Card>
  );
}
