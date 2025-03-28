
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Source } from "@/pages/configuracion/press/types/press-types";
import { getInitialSources } from "@/pages/configuracion/press/components/initialSources";

export function useSourcesManagement() {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSources, setFilteredSources] = useState<Source[]>([]);
  const itemsPerPage = 10;

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      const initialSources = getInitialSources();
      setSources(initialSources);
      setFilteredSources(initialSources);
    } catch (error) {
      console.error("Error loading sources:", error);
      toast.error("Error al cargar las fuentes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update filtered sources when sources or search term change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSources(sources);
    } else {
      const filtered = sources.filter(source => 
        source.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSources(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, sources]);

  const handleAddSource = () => {
    if (!newSourceName.trim()) {
      toast.error("El nombre de la fuente no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newSource: Source = {
      id: Date.now().toString(),
      name: newSourceName.trim().toUpperCase(),
    };

    setSources([...sources, newSource]);
    setNewSourceName("");
    setIsAddingNew(false);
    toast.success("Fuente añadida correctamente");
  };

  const handleEditSource = (id: string) => {
    const source = sources.find(s => s.id === id);
    if (source) {
      setEditingId(id);
      setEditedName(source.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre de la fuente no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setSources(sources.map(source => 
      source.id === id ? { ...source, name: editedName.trim().toUpperCase() } : source
    ));
    setEditingId(null);
    toast.success("Fuente actualizada correctamente");
  };

  const handleDeleteSource = (id: string) => {
    // In a real app, this would call an API
    setSources(sources.filter(source => source.id !== id));
    toast.success("Fuente eliminada correctamente");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  
  const getCurrentPageSources = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSources.slice(startIndex, endIndex);
  };

  const paginatedSources = useMemo(() => {
    return getCurrentPageSources();
  }, [currentPage, filteredSources]);

  return {
    sources,
    isLoading,
    editingId,
    newSourceName,
    isAddingNew,
    editedName,
    paginatedSources,
    currentPage,
    totalPages,
    filteredSources,
    itemsPerPage,
    searchTerm,
    setNewSourceName,
    setIsAddingNew,
    setEditedName,
    setSearchTerm,
    setCurrentPage,
    setEditingId,
    handleAddSource,
    handleEditSource,
    handleSaveEdit,
    handleDeleteSource,
    loadData
  };
}
