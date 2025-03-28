
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  fetchRates,
  getRatesByFilter,
  createRate,
  updateRate,
  deleteRate
} from "@/services/tv/rates";
import { fetchChannels } from "@/services/tv/channelService";
import { fetchPrograms } from "@/services/tv/programService";
import { TvRateType, ChannelType, ProgramType } from "@/services/tv/types";

export function useTvRatesManagement() {
  const [rates, setRates] = useState<TvRateType[]>([]);
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all the data we need
      const [ratesData, channelsData, programsData] = await Promise.all([
        fetchRates(),
        fetchChannels(),
        fetchPrograms()
      ]);
      
      setRates(ratesData);
      setChannels(channelsData);
      setPrograms(programsData);
    } catch (error) {
      console.error("Error loading TV rates data:", error);
      toast.error("Error al cargar los datos de tarifas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter rates based on search term and selected channel/program
  const filteredRates = useMemo(() => {
    return rates.filter(rate => {
      const matchesSearch = 
        searchTerm === '' || 
        rate.channel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rate.program_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesChannel = selectedChannel === 'all' || rate.channel_id === selectedChannel;
      const matchesProgram = selectedProgram === 'all' || rate.program_id === selectedProgram;
      
      return matchesSearch && matchesChannel && matchesProgram;
    });
  }, [rates, searchTerm, selectedChannel, selectedProgram]);

  // Get total number of pages
  const totalPages = Math.max(1, Math.ceil(filteredRates.length / itemsPerPage));
  
  // Get current page rates
  const paginatedRates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRates, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedChannel, selectedProgram]);

  // Function to add a new rate
  const handleAddRate = async (rateData: Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>) => {
    try {
      await createRate(rateData);
      toast.success("Tarifa añadida correctamente");
      setIsAddingNew(false);
      loadData();
    } catch (error) {
      console.error("Error adding TV rate:", error);
      toast.error("Error al añadir la tarifa");
    }
  };

  // Function to prepare for editing a rate
  const handleEditRate = (id: string) => {
    setEditingId(id);
  };

  // Function to save an edited rate
  const handleSaveEdit = async (rateData: Omit<TvRateType, 'created_at' | 'channel_name' | 'program_name'>) => {
    try {
      await updateRate(rateData);
      toast.success("Tarifa actualizada correctamente");
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error("Error updating TV rate:", error);
      toast.error("Error al actualizar la tarifa");
    }
  };

  // Function to delete a rate
  const handleDeleteRate = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar esta tarifa?")) {
      return;
    }
    
    try {
      await deleteRate(id);
      toast.success("Tarifa eliminada correctamente");
      loadData();
    } catch (error) {
      console.error("Error deleting TV rate:", error);
      toast.error("Error al eliminar la tarifa");
    }
  };

  return {
    isLoading,
    searchTerm,
    selectedChannel,
    selectedProgram,
    isAddingNew,
    editingId,
    paginatedRates,
    currentPage,
    totalPages,
    itemsPerPage,
    totalRates: filteredRates.length,
    filteredRates,
    channels,
    programs,
    setSearchTerm,
    setSelectedChannel,
    setSelectedProgram,
    setIsAddingNew,
    setCurrentPage,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData
  };
}
