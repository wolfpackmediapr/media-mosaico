
import React, { useState, useEffect } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { fetchStations } from '@/services/radio/stationService';
import { getProgramsByStation } from '@/services/radio/programService';
import { StationType, ProgramType } from '@/services/radio/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface RadioTranscriptionMetadataProps {
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

const RadioTranscriptionMetadata = ({ metadata, onMetadataChange }: RadioTranscriptionMetadataProps) => {
  const [isEditing, setIsEditing] = useState(!metadata?.emisora);
  const [stations, setStations] = useState<StationType[]>([]);
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [loading, setLoading] = useState(false);
  const [localMetadata, setLocalMetadata] = useState({
    emisora: metadata?.emisora || '',
    programa: metadata?.programa || '',
    horario: metadata?.horario || '',
    categoria: metadata?.categoria || '',
    station_id: metadata?.station_id || '',
    program_id: metadata?.program_id || ''
  });

  // Load stations on component mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        const data = await fetchStations();
        setStations(data);
      } catch (error) {
        console.error('Error loading stations:', error);
        toast.error('No se pudieron cargar las emisoras');
      } finally {
        setLoading(false);
      }
    };
    
    loadStations();
  }, []);

  // Load programs when station is selected
  useEffect(() => {
    const loadPrograms = async () => {
      if (!localMetadata.station_id) {
        setPrograms([]);
        return;
      }

      try {
        setLoading(true);
        const data = await getProgramsByStation(localMetadata.station_id);
        setPrograms(data);
      } catch (error) {
        console.error('Error loading programs:', error);
        toast.error('No se pudieron cargar los programas');
      } finally {
        setLoading(false);
      }
    };
    
    loadPrograms();
  }, [localMetadata.station_id]);

  const handleSave = () => {
    setIsEditing(false);
    if (onMetadataChange) {
      onMetadataChange(localMetadata);
    }
  };

  const handleStationChange = (stationId: string) => {
    const selectedStation = stations.find(station => station.id === stationId);
    
    setLocalMetadata(prev => ({
      ...prev,
      station_id: stationId,
      emisora: selectedStation?.name || '',
      // Reset program when station changes
      program_id: '',
      programa: ''
    }));
  };

  const handleProgramChange = (programId: string) => {
    const selectedProgram = programs.find(program => program.id === programId);
    
    setLocalMetadata(prev => ({
      ...prev,
      program_id: programId,
      programa: selectedProgram?.name || ''
    }));
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
                  categoria: metadata?.categoria || '',
                  station_id: metadata?.station_id || '',
                  program_id: metadata?.program_id || ''
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
            <Select
              value={localMetadata.station_id}
              onValueChange={handleStationChange}
              disabled={loading}
            >
              <SelectTrigger id="emisora">
                <SelectValue placeholder="Seleccionar emisora" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="programa">Programa</Label>
            <Select
              value={localMetadata.program_id}
              onValueChange={handleProgramChange}
              disabled={loading || !localMetadata.station_id}
            >
              <SelectTrigger id="programa">
                <SelectValue placeholder={!localMetadata.station_id ? "Selecciona emisora primero" : "Seleccionar programa"} />
              </SelectTrigger>
              <SelectContent>
                {programs.length > 0 ? programs.map((program) => (
                  <SelectItem key={program.id} value={program.id!}>
                    {program.name}
                  </SelectItem>
                )) : (
                  <SelectItem value="no-programs" disabled>
                    {loading ? "Cargando..." : "No hay programas disponibles"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
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
