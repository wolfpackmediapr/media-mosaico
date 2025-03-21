
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface AddGenreFormProps {
  newGenreName: string;
  setNewGenreName: (name: string) => void;
  handleAddGenre: () => void;
  handleCancelAdd: () => void;
}

export function AddGenreForm({
  newGenreName,
  setNewGenreName,
  handleAddGenre,
  handleCancelAdd
}: AddGenreFormProps) {
  return (
    <div className="flex gap-2 mb-4 items-center">
      <Input
        value={newGenreName}
        onChange={(e) => setNewGenreName(e.target.value)}
        placeholder="Nombre del género"
        className="max-w-md"
      />
      <Button onClick={handleAddGenre} size="sm" variant="default">
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
