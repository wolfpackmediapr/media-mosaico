
import { useState, useEffect } from 'react';
import { fetchStations } from '@/services/radio/stationService';
import { getProgramsByStation } from '@/services/radio/programService';
import { StationType, ProgramType } from '@/services/radio/types';
import { toast } from 'sonner';

interface UseRadioMetadataProps {
  initialMetadata?: {
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

export const useRadioMetadata = ({ initialMetadata, onMetadataChange }: UseRadioMetadataProps) => {
  const [localMetadata, setLocalMetadata] = useState({
    emisora: initialMetadata?.emisora || '',
    programa: initialMetadata?.programa || '',
    horario: initialMetadata?.horario || '',
    categoria: initialMetadata?.categoria || '',
    station_id: initialMetadata?.station_id || '',
    program_id: initialMetadata?.program_id || ''
  });

  const [stations, setStations] = useState<StationType[]>([]);
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleCategoryChange = (category: string) => {
    setLocalMetadata(prev => ({
      ...prev,
      categoria: category
    }));
  };

  const saveMetadata = () => {
    if (onMetadataChange) {
      onMetadataChange(localMetadata);
    }
  };

  return {
    localMetadata,
    stations,
    programs,
    loading,
    handleStationChange,
    handleProgramChange,
    handleInputChange,
    handleCategoryChange,
    saveMetadata
  };
};
