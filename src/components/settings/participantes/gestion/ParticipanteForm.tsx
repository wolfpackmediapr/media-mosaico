
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ParticipantType, ParticipantCategoryType } from "@/services/participantes/types";
import { Loader2 } from "lucide-react";

interface ParticipanteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ParticipantType, 'id'> | ParticipantType) => Promise<boolean>;
  participant?: ParticipantType | null;
  categories: ParticipantCategoryType[];
  isEditing?: boolean;
}

export function ParticipanteForm({
  open,
  onClose,
  onSubmit,
  participant,
  categories,
  isEditing = false
}: ParticipanteFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [position, setPosition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    name: false,
    category: false,
    position: false
  });

  useEffect(() => {
    if (participant) {
      setName(participant.name);
      setCategory(participant.category);
      setPosition(participant.position);
    } else {
      setName("");
      setCategory("");
      setPosition("");
    }
  }, [participant, open]);

  const validateForm = () => {
    const newErrors = {
      name: !name.trim(),
      category: !category.trim(),
      position: !position.trim()
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    const participantData = isEditing && participant
      ? { ...participant, name, category, position }
      : { name, category, position };

    const success = await onSubmit(participantData);
    
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
            {isEditing ? "Editar Participante" : "Agregar Participante"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Actualiza los datos del participante." 
              : "Complete los datos para agregar un nuevo participante."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">El nombre es requerido</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={category}
              onValueChange={setCategory}
            >
              <SelectTrigger id="category" className={errors.category ? "border-destructive" : ""}>
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">La categoría es requerida</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Cargo *</Label>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={errors.position ? "border-destructive" : ""}
            />
            {errors.position && (
              <p className="text-sm text-destructive">El cargo es requerido</p>
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
