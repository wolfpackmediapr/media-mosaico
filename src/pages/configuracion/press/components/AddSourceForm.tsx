
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface AddSourceFormProps {
  newSourceName: string;
  setNewSourceName: (name: string) => void;
  handleAddSource: () => void;
  handleCancelAdd: () => void;
}

export function AddSourceForm({
  newSourceName,
  setNewSourceName,
  handleAddSource,
  handleCancelAdd
}: AddSourceFormProps) {
  return (
    <div className="flex gap-2 mb-4 items-center">
      <Input
        value={newSourceName}
        onChange={(e) => setNewSourceName(e.target.value)}
        placeholder="Nombre de la fuente"
        className="max-w-md"
      />
      <Button onClick={handleAddSource} size="sm" variant="default">
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
