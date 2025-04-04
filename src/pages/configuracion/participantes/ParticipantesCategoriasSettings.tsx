
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoriasTable } from "@/components/settings/participantes/categorias/CategoriasTable";
import { CategoriaForm } from "@/components/settings/participantes/categorias/CategoriaForm";
import { CategoriaFilter } from "@/components/settings/participantes/categorias/CategoriaFilter";
import { Pagination } from "@/components/settings/participantes/common/Pagination";
import { useCategoriasManagement } from "@/hooks/participantes/useCategoriasManagement";
import { Plus } from "lucide-react";

export function ParticipantesCategoriasSettings() {
  const {
    currentItems,
    loading,
    searchTerm,
    isAdding,
    isEditing,
    currentCategory,
    currentPage,
    totalPages,
    setSearchTerm,
    setCurrentPage,
    startAdd,
    cancelAdd,
    startEdit,
    cancelEdit,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory
  } = useCategoriasManagement();

  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <CategoriaFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
          
          <Button onClick={startAdd} className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Categoría
          </Button>
        </div>

        <CategoriasTable
          categories={currentItems}
          onEdit={startEdit}
          onDelete={handleDeleteCategory}
          isLoading={loading}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {isAdding && (
        <CategoriaForm
          open={isAdding}
          onClose={cancelAdd}
          onSubmit={handleAddCategory}
        />
      )}

      {isEditing && currentCategory && (
        <CategoriaForm
          open={isEditing}
          onClose={cancelEdit}
          onSubmit={handleUpdateCategory}
          category={currentCategory}
          isEditing
        />
      )}
    </CardContent>
  );
}
