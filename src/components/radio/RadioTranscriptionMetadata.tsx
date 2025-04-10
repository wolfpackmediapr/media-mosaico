
import React, { useState } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';

interface RadioTranscriptionMetadataProps {
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  };
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
  }) => void;
}

const RadioTranscriptionMetadata = ({ metadata, onMetadataChange }: RadioTranscriptionMetadataProps) => {
  const [isEditing, setIsEditing] = useState(!metadata?.emisora);
  const [localMetadata, setLocalMetadata] = useState({
    emisora: metadata?.emisora || '',
    programa: metadata?.programa || '',
    horario: metadata?.horario || '',
    categoria: metadata?.categoria || ''
  });

  const handleSave = () => {
    setIsEditing(false);
    if (onMetadataChange) {
      onMetadataChange(localMetadata);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalMetadata(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <CardHeader className="bg-gradient-to-r from-secondary/50 to-transparent border-b">
      <div className="flex justify-between items-center">
        <CardTitle className="text-xl font-bold">
          Transcripción de Radio
        </CardTitle>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1"
          >
            <Edit className="h-4 w-4" />
            <span>Editar</span>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setLocalMetadata({
                  emisora: metadata?.emisora || '',
                  programa: metadata?.programa || '',
                  horario: metadata?.horario || '',
                  categoria: metadata?.categoria || ''
                });
              }}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              <span>Cancelar</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              <span>Guardar</span>
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <Label htmlFor="emisora">Emisora</Label>
            <Input
              id="emisora"
              name="emisora"
              value={localMetadata.emisora}
              onChange={handleInputChange}
              placeholder="Nombre de la emisora"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="programa">Programa</Label>
            <Input
              id="programa"
              name="programa"
              value={localMetadata.programa}
              onChange={handleInputChange}
              placeholder="Nombre del programa"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="horario">Horario</Label>
            <Input
              id="horario"
              name="horario"
              value={localMetadata.horario}
              onChange={handleInputChange}
              placeholder="Ej. 8:00 AM - 10:00 AM"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="categoria">Categoría</Label>
            <Input
              id="categoria"
              name="categoria"
              value={localMetadata.categoria}
              onChange={handleInputChange}
              placeholder="Noticias, Deportes, etc."
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
          {localMetadata.emisora && (
            <div>
              <span className="font-semibold">Emisora:</span>{' '}
              <span>{localMetadata.emisora}</span>
            </div>
          )}
          {localMetadata.programa && (
            <div>
              <span className="font-semibold">Programa:</span>{' '}
              <span>{localMetadata.programa}</span>
            </div>
          )}
          {localMetadata.horario && (
            <div>
              <span className="font-semibold">Horario:</span>{' '}
              <span>{localMetadata.horario}</span>
            </div>
          )}
          {localMetadata.categoria && (
            <div>
              <span className="font-semibold">Categoría:</span>{' '}
              <span>{localMetadata.categoria}</span>
            </div>
          )}
          {!localMetadata.emisora && !localMetadata.programa && 
          !localMetadata.horario && !localMetadata.categoria && (
            <div className="col-span-2 text-gray-500 italic">
              No hay información de metadatos disponible
            </div>
          )}
        </div>
      )}
    </CardHeader>
  );
};

export default RadioTranscriptionMetadata;
