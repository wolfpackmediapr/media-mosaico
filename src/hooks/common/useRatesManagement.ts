
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface RateType {
  id: string;
  days: string[];
  start_time: string;
  end_time: string;
  rate_15s: number | null;
  rate_30s: number | null;
  rate_45s: number | null;
  rate_60s: number | null;
  created_at?: string;
  [key: string]: any; // For additional properties like channel/station_name, program_name
}

export interface MediaType {
  id: string;
  name: string;
  [key: string]: any;
}

export interface ProgramType {
  id: string;
  name: string;
  [key: string]: any;
}

export interface UseRatesManagementProps<
  T extends RateType,
  M extends MediaType,
  P extends ProgramType
> {
  fetchRates: () => Promise<T[]>;
  createRate: (rateData: Omit<T, 'id' | 'created_at'>) => Promise<any>;
  updateRate: (rateData: Omit<T, 'created_at'>) => Promise<any>;
  deleteRate: (id: string) => Promise<any>;
  fetchMedia: () => Promise<M[]>;
  fetchPrograms: () => Promise<P[]>;
  mediaType: 'tv' | 'radio';
  mediaIdField: string;
  programIdField: string;
  mediaNameField?: string;
  programNameField?: string;
}

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
  programIdField,
  mediaNameField = "name",
  programNameField = "name"
}: UseRatesManagementProps<T, M, P>) {
  const [rates, setRates] = useState<T[]>([]);
  const [filteredRates, setFilteredRates] = useState<T[]>([]);
  const [media, setMedia] = useState<M[]>([]);
  const [programs, setPrograms] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      
      // Initialize filtered rates with all rates
      setFilteredRates(ratesData);
      
      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(ratesData.length / ITEMS_PER_PAGE)));
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

  // Filter rates when filters change
  useEffect(() => {
    const filterRates = () => {
      try {
        let filtered = [...rates];
        
        // Apply search filter if provided
        if (searchTerm) {
          filtered = filtered.filter(rate => {
            const mediaName = rate[`${mediaType === 'tv' ? 'channel' : 'station'}_name`];
            const programName = rate.program_name;
            
            return (
              (mediaName && mediaName.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (programName && programName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
          });
        }
        
        // Apply media filter if selected
        if (selectedMedia !== 'all') {
          filtered = filtered.filter(rate => rate[mediaIdField] === selectedMedia);
        }
        
        // Apply program filter if selected
        if (selectedProgram !== 'all') {
          filtered = filtered.filter(rate => rate[programIdField] === selectedProgram);
        }
        
        setFilteredRates(filtered);
        
        // Reset to page 1 when filter changes
        setCurrentPage(1);
        
        // Calculate total pages
        const newTotalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        setTotalPages(newTotalPages);
      } catch (error) {
        console.error(`Error filtering ${mediaType} rates:`, error);
      }
    };
    
    filterRates();
  }, [selectedMedia, selectedProgram, searchTerm, rates, mediaIdField, programIdField, mediaType]);

  // Get rates for current page
  const getPaginatedRates = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRates.slice(startIndex, endIndex);
  };

  const handleAddRate = async (rateData: Omit<T, 'id' | 'created_at'>) => {
    try {
      await createRate(rateData);
      toast.success("Tarifa añadida correctamente");
      await loadData();
      setIsAddingNew(false);
    } catch (error) {
      console.error(`Error adding ${mediaType} rate:`, error);
      toast.error(`Error al añadir la tarifa de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
      throw error;
    }
  };

  const handleEditRate = (rateId: string) => {
    setEditingId(rateId);
  };

  const handleSaveEdit = async (rateData: Omit<T, 'created_at'>) => {
    try {
      await updateRate(rateData);
      toast.success("Tarifa actualizada correctamente");
      await loadData();
      setEditingId(null);
    } catch (error) {
      console.error(`Error updating ${mediaType} rate:`, error);
      toast.error(`Error al actualizar la tarifa de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
      throw error;
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarifa?")) {
      return;
    }
    
    try {
      await deleteRate(id);
      toast.success("Tarifa eliminada correctamente");
      await loadData();
    } catch (error) {
      console.error(`Error deleting ${mediaType} rate:`, error);
      toast.error(`Error al eliminar la tarifa de ${mediaType === 'tv' ? 'televisión' : 'radio'}`);
    }
  };

  return {
    rates,
    filteredRates,
    media,
    programs,
    loading,
    isLoading: loading,
    selectedMedia,
    selectedProgram,
    searchTerm,
    currentPage,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    isAddingNew,
    editingId,
    paginatedRates: getPaginatedRates(),
    setSearchTerm,
    setSelectedMedia,
    setSelectedProgram,
    setCurrentPage,
    setIsAddingNew,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData,
    totalRates: filteredRates.length
  };
}
