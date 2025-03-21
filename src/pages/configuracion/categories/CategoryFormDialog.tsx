
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Category } from "./types";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: { name_es: string; name_en: string }) => void;
  isEditing: boolean;
  currentCategory: Category | null;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isEditing,
  currentCategory
}: CategoryFormDialogProps) {
  const [formData, setFormData] = useState({
    name_es: "",
    name_en: "",
  });

  useEffect(() => {
    if (currentCategory) {
      setFormData({
        name_es: currentCategory.name_es,
        name_en: currentCategory.name_en || "",
      });
    } else {
      setFormData({ name_es: "", name_en: "" });
    }
  }, [currentCategory, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Agregar Nueva Categoría"}
          </DialogTitle>
          <DialogDescription>
            Complete los campos para {isEditing ? "actualizar la" : "agregar una nueva"} categoría.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name_es">Nombre en Español *</Label>
              <Input
                id="name_es"
                name="name_es"
                value={formData.name_es}
                onChange={handleInputChange}
                placeholder="Nombre de la categoría en español"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="name_en">Nombre en Inglés</Label>
              <Input
                id="name_en"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                placeholder="Nombre de la categoría en inglés (opcional)"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? "Guardar cambios" : "Agregar categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
