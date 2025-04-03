
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface TimeSelectorsProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export function TimeSelectors({ 
  startTime, 
  endTime, 
  onStartTimeChange, 
  onEndTimeChange 
}: TimeSelectorsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="start-time">Hora Inicio *</Label>
        <Input 
          id="start-time" 
          type="time" 
          value={startTime} 
          onChange={(e) => onStartTimeChange(e.target.value)} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-time">Hora Fin *</Label>
        <Input 
          id="end-time" 
          type="time" 
          value={endTime} 
          onChange={(e) => onEndTimeChange(e.target.value)} 
        />
      </div>
    </>
  );
}
