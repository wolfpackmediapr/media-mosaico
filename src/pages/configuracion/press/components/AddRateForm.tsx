
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface AddRateFormProps {
  newRateName: string;
  setNewRateName: (name: string) => void;
  handleAddRate: () => void;
  handleCancelAdd: () => void;
}

export function AddRateForm({
  newRateName,
  setNewRateName,
  handleAddRate,
  handleCancelAdd
}: AddRateFormProps) {
  return (
    <div className="flex gap-2 mb-4 items-center">
      <Input
        value={newRateName}
        onChange={(e) => setNewRateName(e.target.value)}
        placeholder="Nombre de la tarifa"
        className="max-w-md"
      />
      <Button onClick={handleAddRate} size="sm" variant="default">
        <Save className="h-4 w-4 mr-2" />
        Guardar
      </Button>
      <Button onClick={handleCancelAdd} size="sm" variant="outline">
        <X className="h-4 w-4 mr-2" />
        Cancelar
      </Button>
    </div>
  );
}
