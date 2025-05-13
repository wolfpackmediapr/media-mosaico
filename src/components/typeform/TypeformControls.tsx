
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

interface TypeformControlsProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  onHide: () => void;
}

export const TypeformControls: React.FC<TypeformControlsProps> = ({ 
  isRefreshing,
  onRefresh,
  onHide
}) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <Button 
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw 
          className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
        />
        {isRefreshing ? 'Actualizando...' : 'Actualizar'}
      </Button>
      
      <Button 
        variant="ghost"
        size="sm"
        onClick={onHide}
      >
        <X className="h-4 w-4 mr-2" />
        Ocultar formulario
      </Button>
    </div>
  );
};

export default TypeformControls;
