
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardFooter
} from "@/components/ui/card";
import { GenresHeader } from "@/components/settings/press/genres/GenresHeader";
import { GenresContent } from "@/components/settings/press/genres/GenresContent";
import { GenresFooter } from "@/components/settings/press/genres/GenresFooter";
import { useGenresManagement } from "@/hooks/press/useGenresManagement";

export function GenresSettings() {
  const {
    isLoading,
    searchTerm,
    isAddingNew,
    newGenreName,
    editingId,
    editedName,
    paginatedGenres,
    currentPage,
    totalPages,
    filteredGenres,
    itemsPerPage,
    setSearchTerm,
    setIsAddingNew,
    setNewGenreName,
    setEditedName,
    setCurrentPage,
    setEditingId,
    handleAddGenre,
    handleEditGenre,
    handleSaveEdit,
    handleDeleteGenre,
    loadData
  } = useGenresManagement();

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleShowAll = () => {
    setSearchTerm("");
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewGenreName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <GenresHeader onAddClick={() => setIsAddingNew(true)} />
      </CardHeader>
      
      <CardContent>
        <GenresContent
          isLoading={isLoading}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onShowAll={handleShowAll}
          isAddingNew={isAddingNew}
          newGenreName={newGenreName}
          setNewGenreName={setNewGenreName}
          onAddGenre={handleAddGenre}
          onCancelAdd={handleCancelAdd}
          paginatedGenres={paginatedGenres}
          onEdit={handleEditGenre}
          onDelete={handleDeleteGenre}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          editingId={editingId}
          editedName={editedName}
          setEditedName={setEditedName}
        />
      </CardContent>
      
      <CardFooter>
        <GenresFooter
          onRefresh={loadData}
          isLoading={isLoading}
          totalCount={filteredGenres.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </CardFooter>
    </Card>
  );
}
