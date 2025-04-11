
import { useState } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Save, X } from 'lucide-react';
import { StationSelector } from './StationSelector';
import { ProgramSelector } from './ProgramSelector';
import { AdditionalMetadataFields } from './AdditionalMetadataFields';
import { MetadataDisplay } from './MetadataDisplay';
import { useRadioMetadata } from '@/hooks/radio/useRadioMetadata';

interface RadioTranscriptionHeaderProps {
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  onMetadataChange?: (metadata: {
    emisora: string;
    programa: string;
    horario: string;
    categoria: string;
    station_id: string;
    program_id: string;
  }) => void;
}

export const RadioTranscriptionHeader = ({ metadata, onMetadataChange }: RadioTranscriptionHeaderProps) => {
  const [isEditing, setIsEditing] = useState(!metadata?.emisora);
  
  const {
    localMetadata,
    stations,
    programs,
    loading,
    handleStationChange,
    handleProgramChange,
    handleInputChange,
    handleCategoryChange,
    saveMetadata
  } = useRadioMetadata({ initialMetadata: metadata, onMetadataChange });

  const handleSave = () => {
    setIsEditing(false);
    saveMetadata();
  };

  const handleCancel = () => {
    setIsEditing(false);
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
              onClick={handleCancel}
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
          <StationSelector 
            stationId={localMetadata.station_id} 
            stations={stations} 
            loading={loading}
            onStationChange={handleStationChange} 
          />
          <ProgramSelector 
            programId={localMetadata.program_id} 
            programs={programs} 
            loading={loading}
            hasStation={!!localMetadata.station_id}
            onProgramChange={handleProgramChange} 
          />
          <AdditionalMetadataFields 
            horario={localMetadata.horario} 
            categoria={localMetadata.categoria}
            loading={loading}
            onChange={handleInputChange}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
          <MetadataDisplay 
            emisora={localMetadata.emisora}
            programa={localMetadata.programa}
            horario={localMetadata.horario}
            categoria={localMetadata.categoria}
          />
        </div>
      )}
    </CardHeader>
  );
};
