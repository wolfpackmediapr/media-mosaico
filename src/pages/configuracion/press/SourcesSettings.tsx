
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Source } from "./types/press-types";
import { SourcesTable } from "./components/SourcesTable";
import { SourcesSearch } from "./components/SourcesSearch";
import { AddSourceForm } from "./components/AddSourceForm";
import { SourcesPagination } from "./components/SourcesPagination";
import { getInitialSources } from "./components/initialSources";

export function SourcesSettings() {
  const [sources, setSources] = useState<Source[]>([]);
  const [filteredSources, setFilteredSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Initial data - in a real app, this would come from the API
    const initialSources = getInitialSources();
    
    setSources(initialSources);
    setFilteredSources(initialSources);
    setIsLoading(false);
  }, []);

  // Filter sources based on search term
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

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewSourceName("");
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">Cargando fuentes...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Fuentes de Prensa</h3>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar fuente
          </Button>
        )}
      </div>
      
      {/* Search section */}
      <SourcesSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleShowAll={handleShowAll}
      />
      
      {/* Add new source form */}
      {isAddingNew && (
        <AddSourceForm
          newSourceName={newSourceName}
          setNewSourceName={setNewSourceName}
          handleAddSource={handleAddSource}
          handleCancelAdd={handleCancelAdd}
        />
      )}

      {/* Sources table */}
      <SourcesTable
        paginatedSources={paginatedSources}
        onEdit={handleEditSource}
        onDelete={handleDeleteSource}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        editingId={editingId}
        editedName={editedName}
        setEditedName={setEditedName}
      />
      
      {/* Pagination */}
      {filteredSources.length > 0 && (
        <SourcesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredItemsCount={filteredSources.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </CardContent>
  );
}
