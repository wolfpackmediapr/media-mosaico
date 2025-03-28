
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  fetchPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getProgramsByStation
} from "@/services/radio/programService";
import { fetchStations } from "@/services/radio/stationService";
import { ProgramType, StationType } from "@/services/radio/types";

export function useProgramsManagement() {
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<ProgramType[]>([]);
  const [stations, setStations] = useState<StationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramType | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      // First, fetch stations
      const stationsData = await fetchStations();
      console.log("Fetched stations:", stationsData);
      setStations(stationsData);
      
      // Then fetch programs
      const programsData = await fetchPrograms();
      console.log("Fetched programs:", programsData);
      setPrograms(programsData);
      
      // Initialize filtered programs with all programs
      setFilteredPrograms(programsData);
      
      // Calculate total pages
      setTotalPages(Math.max(1, Math.ceil(programsData.length / ITEMS_PER_PAGE)));
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

  // Filter programs when stationId changes
  useEffect(() => {
    const filterPrograms = async () => {
      try {
        if (selectedStationId === 'all') {
          setFilteredPrograms(programs);
        } else {
          const filtered = await getProgramsByStation(selectedStationId);
          setFilteredPrograms(filtered);
        }
        // Reset to page 1 when filter changes
        setCurrentPage(1);
        
        // Calculate total pages
        const newTotalPages = Math.max(1, Math.ceil(
          (selectedStationId === 'all' ? programs.length : filteredPrograms.length) / ITEMS_PER_PAGE
        ));
        setTotalPages(newTotalPages);
      } catch (error) {
        console.error("Error filtering programs:", error);
      }
    };
    
    filterPrograms();
  }, [selectedStationId, programs]);

  // Get programs for current page
  const getCurrentPagePrograms = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPrograms.slice(startIndex, endIndex);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStationChange = (stationId: string) => {
    setSelectedStationId(stationId);
  };

  const handleAddProgram = async (programData: Omit<ProgramType, 'id' | 'created_at'>) => {
    try {
      await createProgram(programData);
      toast.success("Programa añadido correctamente");
      loadData();
      setShowAddDialog(false);
    } catch (error) {
      console.error("Error adding program:", error);
      toast.error("Error al añadir el programa");
    }
  };

  const handleEditProgram = (program: ProgramType) => {
    setEditingProgram(program);
  };

  const handleUpdateProgram = async (programData: ProgramType) => {
    try {
      await updateProgram(programData);
      toast.success("Programa actualizado correctamente");
      loadData();
      setEditingProgram(null);
    } catch (error) {
      console.error("Error updating program:", error);
      toast.error("Error al actualizar el programa");
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este programa?")) {
      return;
    }
    
    try {
      await deleteProgram(id);
      toast.success("Programa eliminado correctamente");
      loadData();
    } catch (error) {
      console.error("Error deleting program:", error);
      toast.error("Error al eliminar el programa");
    }
  };

  return {
    programs,
    filteredPrograms,
    stations,
    loading,
    showAddDialog,
    editingProgram,
    selectedStationId,
    currentPage,
    totalPages,
    ITEMS_PER_PAGE,
    getCurrentPagePrograms,
    handlePageChange,
    handleStationChange,
    handleAddProgram,
    handleEditProgram,
    handleUpdateProgram,
    handleDeleteProgram,
    setShowAddDialog,
    setEditingProgram,
    loadData
  };
}
