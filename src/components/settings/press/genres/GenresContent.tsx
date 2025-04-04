
import { GenresTable } from "@/pages/configuracion/press/components/GenresTable";
import { GenresSearch } from "@/pages/configuracion/press/components/GenresSearch";
import { AddGenreForm } from "@/pages/configuracion/press/components/AddGenreForm";
import { Genre } from "@/pages/configuracion/press/types/press-types";

interface GenresContentProps {
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onShowAll: () => void;
  isAddingNew: boolean;
  newGenreName: string;
  setNewGenreName: (name: string) => void;
  onAddGenre: () => void;
  onCancelAdd: () => void;
  paginatedGenres: Genre[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onSaveEdit: (id: string) => Promise<void>;
  onCancelEdit: () => void;
  editingId: string | null;
  editedName: string;
  setEditedName: (name: string) => void;
}

export function GenresContent({
  isLoading,
  searchTerm,
  onSearchChange,
  onShowAll,
  isAddingNew,
  newGenreName,
  setNewGenreName,
  onAddGenre,
  onCancelAdd,
  paginatedGenres,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  editingId,
  editedName,
  setEditedName
}: GenresContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-56">
        <p className="text-muted-foreground">Cargando géneros...</p>
      </div>
    );
  }

  return (
    <>
      {/* Search section */}
      <GenresSearch 
        searchTerm={searchTerm}
        setSearchTerm={onSearchChange}
        handleShowAll={onShowAll}
      />
      
      {/* Add new genre form */}
      {isAddingNew && (
        <AddGenreForm
          newGenreName={newGenreName}
          setNewGenreName={setNewGenreName}
          handleAddGenre={onAddGenre}
          handleCancelAdd={onCancelAdd}
        />
      )}

      {/* Genres table */}
      <GenresTable
        paginatedGenres={paginatedGenres}
        onEdit={onEdit}
        onDelete={onDelete}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        editingId={editingId}
        editedName={editedName}
        setEditedName={setEditedName}
      />
    </>
  );
}
