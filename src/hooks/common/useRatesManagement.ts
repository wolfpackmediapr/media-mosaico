
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  RateType, 
  MediaType, 
  ProgramType, 
  UseRatesManagementProps, 
  UseRatesManagementReturn 
} from "./types";
import { useRatesFiltering } from "./useRatesFiltering";
import { useRatesCrud } from "./useRatesCrud";

// Use 'export type' to re-export type definitions when isolatedModules is enabled
export type { RateType, MediaType, ProgramType };

export function useRatesManagement<
  T extends RateType,
  M extends MediaType,
  P extends ProgramType
>({
  fetchRates,
  createRate,
  updateRate,
  deleteRate,
  fetchMedia,
  fetchPrograms,
  mediaType,
  mediaIdField,
  programIdField
}: UseRatesManagementProps<T, M, P>): UseRatesManagementReturn<T, M, P> {
  const [rates, setRates] = useState<T[]>([]);
  const [media, setMedia] = useState<M[]>([]);
  const [programs, setPrograms] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  
  const ITEMS_PER_PAGE = 50;

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [ratesData, mediaData, programsData] = await Promise.all([
        fetchRates(),
        fetchMedia(),
        fetchPrograms()
      ]);
      
      setRates(ratesData);
      setMedia(mediaData);
      setPrograms(programsData);
    } catch (error) {
      console.error(`Error loading ${mediaType} rates data:`, error);
      toast.error(`Error al cargar los datos de tarifas de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Use the filtering hook
  const filtering = useRatesFiltering<T>({
    rates,
    mediaIdField,
    programIdField,
    mediaType,
    itemsPerPage: ITEMS_PER_PAGE
  });

  // Use the CRUD operations hook
  const crud = useRatesCrud<T>({
    createRate,
    updateRate,
    deleteRate,
    loadData,
    mediaType
  });

  // Return combined state and functions
  return {
    rates,
    media,
    programs,
    loading,
    isLoading: loading,
    ...filtering,
    ...crud,
    loadData,
    itemsPerPage: ITEMS_PER_PAGE
  };
}
