
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from '@/hooks/radio/useCategories';

interface CategorySelectorProps {
  categoryValue: string;
  loading: boolean;
  onCategoryChange: (category: string) => void;
}

export const CategorySelector = ({ categoryValue, loading, onCategoryChange }: CategorySelectorProps) => {
  const { categories, isLoading } = useCategories();
  
  return (
    <div className="space-y-1">
      <Label htmlFor="categoria">Categoría</Label>
      <Select
        value={categoryValue}
        onValueChange={onCategoryChange}
        disabled={loading || isLoading}
      >
        <SelectTrigger id="categoria">
          <SelectValue placeholder="Seleccionar categoría" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name_es}>
              {category.name_es}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
