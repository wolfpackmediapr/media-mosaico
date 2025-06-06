import React from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Edit, Users } from "lucide-react";

interface TvViewModeToggleProps {
  mode: 'interactive' | 'edit';
  onChange: (mode: 'interactive' | 'edit') => void;
  hasUtterances: boolean;
}

export const TvViewModeToggle: React.FC<TvViewModeToggleProps> = ({
  mode,
  onChange,
  hasUtterances,
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Modo de Vista:</span>
      
      <ToggleGroup 
        type="single" 
        value={mode} 
        onValueChange={(value) => value && onChange(value as 'interactive' | 'edit')}
        className="bg-background"
      >
        <ToggleGroupItem 
          value="edit" 
          aria-label="Modo edición"
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Editar</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="interactive" 
          aria-label="Modo interactivo"
          disabled={!hasUtterances}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Interactivo</span>
        </ToggleGroupItem>
      </ToggleGroup>
      
      {!hasUtterances && (
        <span className="text-xs text-muted-foreground ml-2">
          Speaker data not available
        </span>
      )}
    </div>
  );
};