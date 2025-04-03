
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DaysSelectorProps {
  days: Record<string, boolean>;
  onDayToggle: (day: string, checked: boolean) => void;
}

export function DaysSelector({ days, onDayToggle }: DaysSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Días *</Label>
      <div className="flex flex-wrap gap-4 pt-2">
        <DayCheckbox 
          id="day-monday" 
          label="L" 
          checked={days.L} 
          onChange={(checked) => onDayToggle('L', checked)} 
        />
        <DayCheckbox 
          id="day-tuesday" 
          label="M" 
          checked={days.K} 
          onChange={(checked) => onDayToggle('K', checked)} 
        />
        <DayCheckbox 
          id="day-wednesday" 
          label="X" 
          checked={days.M} 
          onChange={(checked) => onDayToggle('M', checked)} 
        />
        <DayCheckbox 
          id="day-thursday" 
          label="J" 
          checked={days.J} 
          onChange={(checked) => onDayToggle('J', checked)} 
        />
        <DayCheckbox 
          id="day-friday" 
          label="V" 
          checked={days.V} 
          onChange={(checked) => onDayToggle('V', checked)} 
        />
        <DayCheckbox 
          id="day-saturday" 
          label="S" 
          checked={days.S} 
          onChange={(checked) => onDayToggle('S', checked)} 
        />
        <DayCheckbox 
          id="day-sunday" 
          label="D" 
          checked={days.D} 
          onChange={(checked) => onDayToggle('D', checked)} 
        />
      </div>
    </div>
  );
}

interface DayCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function DayCheckbox({ id, label, checked, onChange }: DayCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox 
        id={id} 
        checked={checked} 
        onCheckedChange={onChange} 
      />
      <Label htmlFor={id} className="cursor-pointer">{label}</Label>
    </div>
  );
}
