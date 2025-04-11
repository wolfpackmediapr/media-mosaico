
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CategorySelector } from './CategorySelector';

interface AdditionalMetadataFieldsProps {
  horario: string;
  categoria: string;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (category: string) => void;
}

export const AdditionalMetadataFields = ({ 
  horario, 
  categoria, 
  loading,
  onChange, 
  onCategoryChange 
}: AdditionalMetadataFieldsProps) => {
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
      <CategorySelector 
        categoryValue={categoria}
        loading={loading}
        onCategoryChange={onCategoryChange}
      />
    </>
  );
};
