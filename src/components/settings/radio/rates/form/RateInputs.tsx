
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RateInputsProps {
  rate15s: string;
  rate30s: string;
  rate45s: string;
  rate60s: string;
  onRate15sChange: (value: string) => void;
  onRate30sChange: (value: string) => void;
  onRate45sChange: (value: string) => void;
  onRate60sChange: (value: string) => void;
}

export function RateInputs({ 
  rate15s, 
  rate30s, 
  rate45s, 
  rate60s,
  onRate15sChange,
  onRate30sChange,
  onRate45sChange,
  onRate60sChange
}: RateInputsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="rate-15s">Tarifa 15s ($)</Label>
        <Input 
          id="rate-15s" 
          type="number" 
          value={rate15s} 
          onChange={(e) => onRate15sChange(e.target.value)} 
          placeholder="Precio para 15 segundos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate-30s">Tarifa 30s ($)</Label>
        <Input 
          id="rate-30s" 
          type="number" 
          value={rate30s} 
          onChange={(e) => onRate30sChange(e.target.value)} 
          placeholder="Precio para 30 segundos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate-45s">Tarifa 45s ($)</Label>
        <Input 
          id="rate-45s" 
          type="number" 
          value={rate45s} 
          onChange={(e) => onRate45sChange(e.target.value)} 
          placeholder="Precio para 45 segundos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate-60s">Tarifa 60s ($)</Label>
        <Input 
          id="rate-60s" 
          type="number" 
          value={rate60s} 
          onChange={(e) => onRate60sChange(e.target.value)} 
          placeholder="Precio para 60 segundos"
        />
      </div>
    </>
  );
}
