
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Source } from "./types/press-types";
import { SectionsTable } from "./components/SectionsTable";
import { SectionsSearch } from "./components/SectionsSearch";
import { AddSectionForm } from "./components/AddSectionForm";
import { SectionsPagination } from "./components/SectionsPagination";
import { getInitialSections } from "./components/initialSections";

export function SectionsSettings() {
  const [sections, setSections] = useState<Source[]>([]);
  const [filteredSections, setFilteredSections] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Initial data - in a real app, this would come from the API
    const initialSections = getInitialSections();
    
    setSections(initialSections);
    setFilteredSections(initialSections);
    setIsLoading(false);
  }, []);

  // Filter sections based on search term
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

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewSectionName("");
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  const paginatedSections = filteredSections.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">Cargando secciones...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Secciones de Prensa</h3>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar sección
          </Button>
        )}
      </div>
      
      {/* Search section */}
      <SectionsSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleShowAll={handleShowAll}
      />
      
      {/* Add new section form */}
      {isAddingNew && (
        <AddSectionForm
          newSectionName={newSectionName}
          setNewSectionName={setNewSectionName}
          handleAddSection={handleAddSection}
          handleCancelAdd={handleCancelAdd}
        />
      )}

      {/* Sections table */}
      <SectionsTable
        paginatedSections={paginatedSections}
        onEdit={handleEditSection}
        onDelete={handleDeleteSection}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        editingId={editingId}
        editedName={editedName}
        setEditedName={setEditedName}
      />
      
      {/* Pagination */}
      {filteredSections.length > 0 && (
        <SectionsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredItemsCount={filteredSections.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </CardContent>
  );
}
