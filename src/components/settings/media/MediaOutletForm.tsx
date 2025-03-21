import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Check, X } from "lucide-react";

interface MediaOutletFormProps {
  onSubmit: (formData: { type: string; name: string; folder: string }) => Promise<void>;
  onCancel: () => void;
}

export function MediaOutletForm({ onSubmit, onCancel }: MediaOutletFormProps) {
  const [formData, setFormData] = useState({
    type: "tv",
    name: "",
    folder: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="mb-6 p-4 border rounded-md bg-slate-100">
      <div className="mb-4 bg-slate-400 text-white py-2 px-3">
        <h3 className="text-lg font-bold">MEDIOS</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[150px_1fr] items-center">
          <div className="bg-slate-300 py-2 px-4 font-medium">
            NOMBRE
          </div>
          <div className="px-4">
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nombre del medio"
              required
              className="w-full"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-[150px_1fr] items-center">
          <div className="bg-slate-300 py-2 px-4 font-medium">
            TIPO
          </div>
          <div className="px-4">
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({...formData, type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Por favor Seleccione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tv">TV</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="prensa">Prensa</SelectItem>
                <SelectItem value="prensa_escrita">Prensa Escrita</SelectItem>
                <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-[150px_1fr] items-center">
          <div className="bg-slate-300 py-2 px-4 font-medium">
            NOMBRE CARPETA
          </div>
          <div className="px-4">
            <Input
              id="folder"
              value={formData.folder}
              onChange={(e) => setFormData({...formData, folder: e.target.value})}
              placeholder="Nombre de la carpeta (opcional)"
              className="w-full"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button type="submit" variant="default" className="bg-green-600 hover:bg-green-700">
            <Check className="h-4 w-4 mr-1" /> Aceptar
          </Button>
          <Button type="button" variant="destructive" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
