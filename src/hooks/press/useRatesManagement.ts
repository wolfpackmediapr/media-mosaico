
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Source } from "@/pages/configuracion/press/types/press-types";
import { getInitialRates } from "@/pages/configuracion/press/components/initialRates";

export function useRatesManagement() {
  const [rates, setRates] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRateName, setNewRateName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRates, setFilteredRates] = useState<Source[]>([]);
  const itemsPerPage = 10;

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      const initialRates = getInitialRates();
      setRates(initialRates);
      setFilteredRates(initialRates);
    } catch (error) {
      console.error("Error loading rates:", error);
      toast.error("Error al cargar las tarifas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update filtered rates when rates or search term change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRates(rates);
    } else {
      const filtered = rates.filter(rate => 
        rate.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRates(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, rates]);

  const handleAddRate = () => {
    if (!newRateName.trim()) {
      toast.error("El nombre de la tarifa no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newRate: Source = {
      id: Date.now().toString(),
      name: newRateName.trim().toUpperCase(),
    };

    setRates([...rates, newRate]);
    setNewRateName("");
    setIsAddingNew(false);
    toast.success("Tarifa añadida correctamente");
  };

  const handleEditRate = (id: string) => {
    const rate = rates.find(r => r.id === id);
    if (rate) {
      setEditingId(id);
      setEditedName(rate.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre de la tarifa no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setRates(rates.map(rate => 
      rate.id === id ? { ...rate, name: editedName.trim().toUpperCase() } : rate
    ));
    setEditingId(null);
    toast.success("Tarifa actualizada correctamente");
  };

  const handleDeleteRate = (id: string) => {
    // In a real app, this would call an API
    setRates(rates.filter(rate => rate.id !== id));
    toast.success("Tarifa eliminada correctamente");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredRates.length / itemsPerPage);
  
  const getCurrentPageRates = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRates.slice(startIndex, endIndex);
  };

  const paginatedRates = useMemo(() => {
    return getCurrentPageRates();
  }, [currentPage, filteredRates]);

  return {
    rates,
    isLoading,
    editingId,
    newRateName,
    isAddingNew,
    editedName,
    paginatedRates,
    currentPage,
    totalPages,
    filteredRates,
    itemsPerPage,
    searchTerm,
    setNewRateName,
    setIsAddingNew,
    setEditedName,
    setSearchTerm,
    setCurrentPage,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData
  };
}
