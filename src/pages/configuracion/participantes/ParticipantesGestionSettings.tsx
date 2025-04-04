
import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParticipantesTable } from "@/components/settings/participantes/gestion/ParticipantesTable";
import { ParticipanteForm } from "@/components/settings/participantes/gestion/ParticipanteForm";
import { ParticipanteFilter } from "@/components/settings/participantes/gestion/ParticipanteFilter";
import { Pagination } from "@/components/settings/participantes/common/Pagination";
import { useParticipantesManagement } from "@/hooks/participantes/useParticipantesManagement";
import { fetchCategories } from "@/services/participantes/participantesService";
import { ParticipantCategoryType } from "@/services/participantes/types";
import { Plus } from "lucide-react";

export function ParticipantesGestionSettings() {
  const [categories, setCategories] = useState<ParticipantCategoryType[]>([]);
  
  const {
    currentItems,
    loading,
    searchTerm,
    selectedCategory,
    isAdding,
    isEditing,
    currentParticipant,
    currentPage,
    totalPages,
    setSearchTerm,
    setSelectedCategory,
    setCurrentPage,
    startAdd,
    cancelAdd,
    startEdit,
    cancelEdit,
    handleAddParticipant,
    handleUpdateParticipant,
    handleDeleteParticipant
  } = useParticipantesManagement();

  // Load categories for the dropdown
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };
    loadCategories();
  }, []);

  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <ParticipanteFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
          />
          
          <Button onClick={startAdd} className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Participante
          </Button>
        </div>

        <ParticipantesTable
          participants={currentItems}
          onEdit={startEdit}
          onDelete={handleDeleteParticipant}
          isLoading={loading}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {isAdding && (
        <ParticipanteForm
          open={isAdding}
          onClose={cancelAdd}
          onSubmit={handleAddParticipant}
          categories={categories}
        />
      )}

      {isEditing && currentParticipant && (
        <ParticipanteForm
          open={isEditing}
          onClose={cancelEdit}
          onSubmit={handleUpdateParticipant}
          participant={currentParticipant}
          categories={categories}
          isEditing
        />
      )}
    </CardContent>
  );
}
