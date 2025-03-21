
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Genre } from "./types/press-types";
import { GenresTable } from "./components/GenresTable";
import { GenresSearch } from "./components/GenresSearch";
import { AddGenreForm } from "./components/AddGenreForm";
import { GenresPagination } from "./components/GenresPagination";
import { getInitialGenres } from "./components/initialGenres";

export function GenresSettings() {
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

  useEffect(() => {
    // Initial data - in a real app, this would come from the API
    const initialGenres = getInitialGenres();
    
    setGenres(initialGenres);
    setFilteredGenres(initialGenres);
    setIsLoading(false);
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

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewGenreName("");
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredGenres.length / itemsPerPage);
  const paginatedGenres = filteredGenres.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-56">
          <p className="text-muted-foreground">Cargando géneros...</p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium">Géneros Periodísticos</h3>
        {!isAddingNew && (
          <Button onClick={() => setIsAddingNew(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar género
          </Button>
        )}
      </div>
      
      {/* Search section */}
      <GenresSearch 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleShowAll={handleShowAll}
      />
      
      {/* Add new genre form */}
      {isAddingNew && (
        <AddGenreForm
          newGenreName={newGenreName}
          setNewGenreName={setNewGenreName}
          handleAddGenre={handleAddGenre}
          handleCancelAdd={handleCancelAdd}
        />
      )}

      {/* Genres table */}
      <GenresTable
        paginatedGenres={paginatedGenres}
        onEdit={handleEditGenre}
        onDelete={handleDeleteGenre}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        editingId={editingId}
        editedName={editedName}
        setEditedName={setEditedName}
      />
      
      {/* Pagination */}
      {filteredGenres.length > 0 && (
        <GenresPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredItemsCount={filteredGenres.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </CardContent>
  );
}
