
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticipantCategoryType } from "@/services/participantes/types";
import { Loader2 } from "lucide-react";

interface CategoriaFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: string | ParticipantCategoryType) => Promise<boolean>;
  category?: ParticipantCategoryType | null;
  isEditing?: boolean;
}

export function CategoriaForm({
  open,
  onClose,
  onSubmit,
  category,
  isEditing = false
}: CategoriaFormProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
    } else {
      setName("");
    }
    setError(false);
  }, [category, open]);

  const validateForm = () => {
    const hasError = !name.trim();
    setError(hasError);
    return !hasError;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    const success = await onSubmit(
      isEditing && category
        ? { ...category, name }
        : name
    );
    
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Agregar Categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Actualiza el nombre de la categoría." 
              : "Ingrese el nombre para agregar una nueva categoría."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nombre *</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive">El nombre es requerido</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
