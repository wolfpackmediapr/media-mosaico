
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AdditionalMetadataFieldsProps {
  horario: string;
  categoria: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AdditionalMetadataFields = ({ horario, categoria, onChange }: AdditionalMetadataFieldsProps) => {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="horario">Horario</Label>
        <Input
          id="horario"
          name="horario"
          value={horario}
          onChange={onChange}
          placeholder="Ej. 8:00 AM - 10:00 AM"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="categoria">Categoría</Label>
        <Input
          id="categoria"
          name="categoria"
          value={categoria}
          onChange={onChange}
          placeholder="Noticias, Deportes, etc."
        />
      </div>
    </>
  );
};
