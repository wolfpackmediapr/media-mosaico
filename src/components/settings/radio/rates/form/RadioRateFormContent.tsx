
import { StationSelector } from './StationSelector';
import { ProgramSelector } from './ProgramSelector';
import { DaysSelector } from './DaysSelector';
import { TimeSelectors } from './TimeSelectors';
import { RateInputs } from './RateInputs';
import { StationType, ProgramType } from "@/services/radio/types";

interface RadioRateFormContentProps {
  stationId: string;
  programId: string;
  startTime: string;
  endTime: string;
  days: Record<string, boolean>;
  rate15s: string;
  rate30s: string;
  rate45s: string;
  rate60s: string;
  stations: StationType[];
  filteredPrograms: ProgramType[];
  onStationChange: (stationId: string) => void;
  onProgramChange: (programId: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onDayToggle: (day: string, checked: boolean) => void;
  onRate15sChange: (value: string) => void;
  onRate30sChange: (value: string) => void;
  onRate45sChange: (value: string) => void;
  onRate60sChange: (value: string) => void;
}

export function RadioRateFormContent({
  stationId,
  programId,
  startTime,
  endTime,
  days,
  rate15s,
  rate30s,
  rate45s,
  rate60s,
  stations,
  filteredPrograms,
  onStationChange,
  onProgramChange,
  onStartTimeChange,
  onEndTimeChange,
  onDayToggle,
  onRate15sChange,
  onRate30sChange,
  onRate45sChange,
  onRate60sChange
}: RadioRateFormContentProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      <StationSelector 
        stationId={stationId} 
        stations={stations} 
        onStationChange={onStationChange} 
      />

      <ProgramSelector 
        programId={programId} 
        programs={filteredPrograms} 
        onProgramChange={onProgramChange} 
        disabled={!stationId} 
      />

      <DaysSelector days={days} onDayToggle={onDayToggle} />

      <TimeSelectors 
        startTime={startTime} 
        endTime={endTime} 
        onStartTimeChange={onStartTimeChange} 
        onEndTimeChange={onEndTimeChange} 
      />

      <RateInputs 
        rate15s={rate15s}
        rate30s={rate30s}
        rate45s={rate45s}
        rate60s={rate60s}
        onRate15sChange={onRate15sChange}
        onRate30sChange={onRate30sChange}
        onRate45sChange={onRate45sChange}
        onRate60sChange={onRate60sChange}
      />
    </div>
  );
}
