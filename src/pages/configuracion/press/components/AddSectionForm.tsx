
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface AddSectionFormProps {
  newSectionName: string;
  setNewSectionName: (name: string) => void;
  handleAddSection: () => void;
  handleCancelAdd: () => void;
}

export function AddSectionForm({
  newSectionName,
  setNewSectionName,
  handleAddSection,
  handleCancelAdd
}: AddSectionFormProps) {
  return (
    <div className="flex gap-2 mb-4 items-center">
      <Input
        value={newSectionName}
        onChange={(e) => setNewSectionName(e.target.value)}
        placeholder="Nombre de la sección"
        className="max-w-md"
      />
      <Button onClick={handleAddSection} size="sm" variant="default">
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
