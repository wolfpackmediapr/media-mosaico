
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  fetchPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  fetchChannels
} from "@/services/tv/programService";
import { ProgramType, ChannelType } from "@/services/tv/types";

export function useProgramsManagement(isLoading = false) {
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramType | null>(null);
  
  // Filtering state
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [programsData, channelsData] = await Promise.all([
        fetchPrograms(),
        fetchChannels()
      ]);
      setPrograms(programsData);
      setChannels(channelsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLoading]);

  // Filter programs by selected channel
  const filteredPrograms = useMemo(() => {
    if (selectedChannelId === 'all') {
      return programs;
    }
    return programs.filter(program => program.channel_id === selectedChannelId);
  }, [programs, selectedChannelId]);

  // Calculate total pages based on filtered programs
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE));
  }, [filteredPrograms]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedChannelId]);

  const handleAddProgram = async (programData: Omit<ProgramType, 'id'>) => {
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

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get current page programs
  const getCurrentPagePrograms = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredPrograms.slice(startIndex, endIndex);
  };

  return {
    programs,
    channels,
    loading,
    showAddDialog,
    editingProgram,
    selectedChannelId,
    currentPage,
    totalPages,
    filteredPrograms,
    setShowAddDialog,
    setEditingProgram,
    handleAddProgram,
    handleEditProgram,
    handleUpdateProgram,
    handleDeleteProgram,
    handleChannelChange,
    handlePageChange,
    getCurrentPagePrograms,
    loadData,
    isPageLoading: loading || isLoading
  };
}
