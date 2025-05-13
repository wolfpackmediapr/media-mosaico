
import React from 'react';
import { Button } from '@/components/ui/button';
import { FormInput } from 'lucide-react';

interface TypeformPromptProps {
  title: string;
  description: string;
  isAuthenticated?: boolean | null;
  onShow: () => void;
}

export const TypeformPrompt: React.FC<TypeformPromptProps> = ({
  title,
  description,
  isAuthenticated = true,
  onShow
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      
      <Button
        onClick={onShow}
        disabled={isAuthenticated !== true}
      >
        <FormInput className="w-4 h-4 mr-2" />
        {isAuthenticated === true ? 'Cargar formulario' : 'Inicie sesión para ver el formulario'}
      </Button>
      
      {isAuthenticated !== true && (
        <p className="text-xs text-muted-foreground mt-4">
          Debe iniciar sesión para acceder a este formulario.
        </p>
      )}
    </div>
  );
};

export default TypeformPrompt;
