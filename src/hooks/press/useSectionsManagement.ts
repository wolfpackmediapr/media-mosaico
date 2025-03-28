
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Source } from "@/pages/configuracion/press/types/press-types";
import { getInitialSections } from "@/pages/configuracion/press/components/initialSections";

export function useSectionsManagement() {
  const [sections, setSections] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSections, setFilteredSections] = useState<Source[]>([]);
  const itemsPerPage = 10;

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      const initialSections = getInitialSections();
      setSections(initialSections);
      setFilteredSections(initialSections);
    } catch (error) {
      console.error("Error loading sections:", error);
      toast.error("Error al cargar las secciones");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update filtered sections when sections or search term change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSections(sections);
    } else {
      const filtered = sections.filter(section => 
        section.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSections(filtered);
    }
    setCurrentPage(1); // Reset to first page on search
  }, [searchTerm, sections]);

  const handleAddSection = () => {
    if (!newSectionName.trim()) {
      toast.error("El nombre de la sección no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    const newSection: Source = {
      id: Date.now().toString(),
      name: newSectionName.trim().toUpperCase(),
    };

    setSections([...sections, newSection]);
    setNewSectionName("");
    setIsAddingNew(false);
    toast.success("Sección añadida correctamente");
  };

  const handleEditSection = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (section) {
      setEditingId(id);
      setEditedName(section.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (!editedName.trim()) {
      toast.error("El nombre de la sección no puede estar vacío");
      return;
    }

    // In a real app, this would call an API
    setSections(sections.map(section => 
      section.id === id ? { ...section, name: editedName.trim().toUpperCase() } : section
    ));
    setEditingId(null);
    toast.success("Sección actualizada correctamente");
  };

  const handleDeleteSection = (id: string) => {
    // In a real app, this would call an API
    setSections(sections.filter(section => section.id !== id));
    toast.success("Sección eliminada correctamente");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  
  const getCurrentPageSections = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSections.slice(startIndex, endIndex);
  };

  const paginatedSections = useMemo(() => {
    return getCurrentPageSections();
  }, [currentPage, filteredSections]);

  return {
    sections,
    isLoading,
    editingId,
    newSectionName,
    isAddingNew,
    editedName,
    paginatedSections,
    currentPage,
    totalPages,
    filteredSections,
    itemsPerPage,
    searchTerm,
    setNewSectionName,
    setIsAddingNew,
    setEditedName,
    setSearchTerm,
    setCurrentPage,
    setEditingId,
    handleAddSection,
    handleEditSection,
    handleSaveEdit,
    handleDeleteSection,
    loadData
  };
}
