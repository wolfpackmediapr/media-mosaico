
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ClientFormProps {
  onSubmit: (formData: { name: string; category: string; subcategory: string; keywords: string[] }) => void;
  onCancel: () => void;
  initialData?: {
    name: string;
    category: string;
    subcategory?: string | null;
    keywords?: string[] | null;
  };
  isEditing?: boolean;
}

export function ClientForm({ onSubmit, onCancel, initialData, isEditing = false }: ClientFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || '',
    subcategory: initialData?.subcategory || '',
    keywordsString: initialData?.keywords ? initialData.keywords.join(', ') : ''
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = formData.keywordsString
      ? formData.keywordsString.split(',').map(k => k.trim()).filter(k => k !== '')
      : [];
    
    onSubmit({
      name: formData.name,
      category: formData.category,
      subcategory: formData.subcategory,
      keywords
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-4 rounded-md border mb-6 space-y-4">
      <h3 className="text-lg font-medium mb-2">{isEditing ? 'Editar cliente' : 'Añadir nuevo cliente'}</h3>
      
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del cliente</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Nombre del cliente"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Categoría</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => handleChange('category', value)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GOBIERNO">Gobierno</SelectItem>
            <SelectItem value="EMPRESA">Empresa</SelectItem>
            <SelectItem value="ONG">ONG</SelectItem>
            <SelectItem value="EDUCACION">Educación</SelectItem>
            <SelectItem value="SALUD">Salud</SelectItem>
            <SelectItem value="OTRO">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subcategory">Subcategoría</Label>
        <Input
          id="subcategory"
          value={formData.subcategory}
          onChange={(e) => handleChange('subcategory', e.target.value)}
          placeholder="Subcategoría (opcional)"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="keywords">Palabras clave</Label>
        <Textarea
          id="keywords"
          value={formData.keywordsString}
          onChange={(e) => handleChange('keywordsString', e.target.value)}
          placeholder="Palabras clave separadas por comas"
          className="resize-none h-24"
        />
        <p className="text-xs text-muted-foreground">Ingrese palabras clave separadas por comas. Estas se utilizarán para identificar el contenido relevante para este cliente.</p>
      </div>
      
      <div className="flex justify-end space-x-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          {isEditing ? 'Guardar cambios' : 'Añadir cliente'}
        </Button>
      </div>
    </form>
  );
}
