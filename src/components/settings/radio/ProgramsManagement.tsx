
import { Card, CardContent } from "@/components/ui/card";
import { ProgramFormDialog } from "./ProgramFormDialog";
import { ProgramsHeader } from "./ProgramsHeader";
import { ProgramsContent } from "./ProgramsContent";
import { ProgramsFooter } from "./ProgramsFooter";
import { useProgramsManagement } from "@/hooks/radio/useProgramsManagement";

export function ProgramsManagement() {
  const {
    programs,
    filteredPrograms,
    stations,
    loading,
    showAddDialog,
    editingProgram,
    selectedStationId,
    currentPage,
    totalPages,
    ITEMS_PER_PAGE,
    getCurrentPagePrograms,
    handlePageChange,
    handleStationChange,
    handleAddProgram,
    handleEditProgram,
    handleUpdateProgram,
    handleDeleteProgram,
    setShowAddDialog,
    setEditingProgram,
    loadData
  } = useProgramsManagement();

  return (
    <Card>
      <ProgramsHeader onAddProgram={() => setShowAddDialog(true)} />
      
      <CardContent>
        <ProgramsContent 
          loading={loading}
          programs={getCurrentPagePrograms()}
          stations={stations}
          hasPrograms={programs.length > 0}
          filteredProgramsLength={filteredPrograms.length}
          selectedStationId={selectedStationId}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onStationChange={handleStationChange}
          onPageChange={handlePageChange}
          onEditProgram={handleEditProgram}
          onDeleteProgram={handleDeleteProgram}
        />
      </CardContent>

      <ProgramsFooter onRefresh={loadData} />

      {/* Add Program Dialog */}
      <ProgramFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddProgram}
        title="Añadir Programa"
        stations={stations}
      />

      {/* Edit Program Dialog */}
      {editingProgram && (
        <ProgramFormDialog
          open={!!editingProgram}
          onOpenChange={(open) => {
            if (!open) setEditingProgram(null);
          }}
          onSubmit={handleUpdateProgram}
          title="Editar Programa"
          program={editingProgram}
          stations={stations}
        />
      )}
    </Card>
  );
}
