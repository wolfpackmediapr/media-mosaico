
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  fetchRates,
  createRate,
  updateRate,
  deleteRate,
  getRatesByFilter
} from "@/services/radio/rateService";
import { fetchStations } from "@/services/radio/stationService";
import { fetchPrograms } from "@/services/radio/programService";
import { RadioRateType, StationType, ProgramType } from "@/services/radio/types";

export function useRadioRatesManagement() {
  const [rates, setRates] = useState<RadioRateType[]>([]);
  const [filteredRates, setFilteredRates] = useState<RadioRateType[]>([]);
  const [stations, setStations] = useState<StationType[]>([]);
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<RadioRateType | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      // First, fetch stations
      const stationsData = await fetchStations();
      setStations(stationsData);
      
      // Then fetch programs
      const programsData = await fetchPrograms();
      setPrograms(programsData);
      
      // Then fetch rates
      const ratesData = await fetchRates();
      setRates(ratesData);
      
      // Initialize filtered rates with all rates
      setFilteredRates(ratesData);
      
      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(ratesData.length / ITEMS_PER_PAGE)));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter rates when filters change
  useEffect(() => {
    const filterRates = async () => {
      try {
        let filtered = [...rates];
        
        // Apply search filter if provided
        if (searchTerm) {
          filtered = filtered.filter(rate => 
            rate.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rate.program_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        // Apply station filter if selected
        if (selectedStation !== 'all') {
          filtered = filtered.filter(rate => rate.station_id === selectedStation);
        }
        
        // Apply program filter if selected
        if (selectedProgram !== 'all') {
          filtered = filtered.filter(rate => rate.program_id === selectedProgram);
        }
        
        setFilteredRates(filtered);
        
        // Reset to page 1 when filter changes
        setCurrentPage(1);
        
        // Calculate total pages
        const newTotalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        setTotalPages(newTotalPages);
      } catch (error) {
        console.error("Error filtering rates:", error);
      }
    };
    
    filterRates();
  }, [selectedStation, selectedProgram, searchTerm, rates]);

  // Get rates for current page
  const getPaginatedRates = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredRates.slice(startIndex, endIndex);
  };

  const handleAddRate = async (rateData: Omit<RadioRateType, 'id' | 'created_at'>) => {
    try {
      await createRate(rateData);
      toast.success("Tarifa añadida correctamente");
      loadData();
      setIsAddingNew(false);
    } catch (error) {
      console.error("Error adding rate:", error);
      toast.error("Error al añadir la tarifa");
    }
  };

  const handleEditRate = (rateId: string) => {
    setEditingId(rateId);
  };

  const handleSaveEdit = async (rateData: RadioRateType) => {
    try {
      await updateRate(rateData);
      toast.success("Tarifa actualizada correctamente");
      loadData();
      setEditingId(null);
    } catch (error) {
      console.error("Error updating rate:", error);
      toast.error("Error al actualizar la tarifa");
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarifa?")) {
      return;
    }
    
    try {
      await deleteRate(id);
      toast.success("Tarifa eliminada correctamente");
      loadData();
    } catch (error) {
      console.error("Error deleting rate:", error);
      toast.error("Error al eliminar la tarifa");
    }
  };

  return {
    rates,
    filteredRates,
    stations,
    programs,
    loading: loading,
    isLoading: loading,
    showAddDialog,
    editingRate,
    selectedStation,
    selectedProgram,
    searchTerm,
    currentPage,
    totalPages,
    itemsPerPage: ITEMS_PER_PAGE,
    isAddingNew,
    editingId,
    paginatedRates: getPaginatedRates(),
    setSearchTerm,
    setSelectedStation,
    setSelectedProgram,
    setCurrentPage,
    setIsAddingNew,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData
  };
}
