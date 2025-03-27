
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Genre } from "@/pages/configuracion/press/types/press-types";
import { getInitialGenres } from "@/pages/configuracion/press/components/initialGenres";

export function useGenresManagement() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGenreName, setNewGenreName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredGenres, setFilteredGenres] = useState<Genre[]>([]);
  const itemsPerPage = 10;

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      const initialGenres = getInitialGenres();
      setGenres(initialGenres);
      setFilteredGenres(initialGenres);
    } catch (error) {
      console.error("Error loading genres:", error);
      toast.error("Error al cargar los géneros");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update filtered genres when genres or search term change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredGenres(genres);
    } else {
      const filtered = genres.filter(genre => 
        genre.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGenres(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, genres]);

  const handleAddGenre = () => {
    if (!newGenreName.trim()) {
      toast.error("El nombre del género no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newGenre: Genre = {
      id: Date.now().toString(),
      name: newGenreName.trim().toUpperCase(),
    };

    setGenres([...genres, newGenre]);
    setNewGenreName("");
    setIsAddingNew(false);
    toast.success("Género añadido correctamente");
  };

  const handleEditGenre = (id: string) => {
    const genre = genres.find(g => g.id === id);
    if (genre) {
      setEditingId(id);
      setEditedName(genre.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre del género no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setGenres(genres.map(genre => 
      genre.id === id ? { ...genre, name: editedName.trim().toUpperCase() } : genre
    ));
    setEditingId(null);
    toast.success("Género actualizado correctamente");
  };

  const handleDeleteGenre = (id: string) => {
    // In a real app, this would call an API
    setGenres(genres.filter(genre => genre.id !== id));
    toast.success("Género eliminado correctamente");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredGenres.length / itemsPerPage);
  
  const getCurrentPageGenres = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredGenres.slice(startIndex, endIndex);
  };

  const paginatedGenres = useMemo(() => {
    return getCurrentPageGenres();
  }, [currentPage, filteredGenres]);

  return {
    genres,
    isLoading,
    editingId,
    newGenreName,
    isAddingNew,
    editedName,
    currentPage,
    searchTerm,
    filteredGenres,
    paginatedGenres,
    totalPages,
    itemsPerPage,
    setNewGenreName,
    setIsAddingNew,
    setEditedName,
    setSearchTerm,
    setCurrentPage,
    handleAddGenre,
    handleEditGenre,
    handleSaveEdit,
    handleDeleteGenre,
    loadData
  };
}
