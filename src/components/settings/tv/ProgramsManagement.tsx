
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader
} from "@/components/ui/card";
import { ProgramFormDialog } from "./ProgramFormDialog";
import { ProgramsHeader } from "./ProgramsHeader";
import { ProgramsContent } from "./ProgramsContent";
import { ProgramsFooter } from "./ProgramsFooter";
import { useProgramsManagement } from "@/hooks/tv/useProgramsManagement";
import { useEffect } from "react";

interface ProgramsManagementProps {
  isLoading?: boolean;
}

export function ProgramsManagement({ isLoading = false }: ProgramsManagementProps) {
  const {
    channels,
    showAddDialog,
    editingProgram,
    selectedChannelId,
    currentPage,
    totalPages,
    filteredPrograms,
    setShowAddDialog,
    setEditingProgram,
    handleAddProgram,
    handleEditProgram,
    handleUpdateProgram,
    handleDeleteProgram,
    handleChannelChange,
    handlePageChange,
    getCurrentPagePrograms,
    loadData,
    isPageLoading,
    programs
  } = useProgramsManagement(isLoading);

  // Force reload data when isLoading prop changes
  useEffect(() => {
    if (isLoading) {
      // Wait until loading is complete to refresh the data
      const timeoutId = setTimeout(() => {
        loadData();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, loadData]);

  return (
    <Card>
      <CardHeader>
        <ProgramsHeader 
          onAddClick={() => setShowAddDialog(true)}
          isDisabled={channels.length === 0 || isPageLoading}
        />
      </CardHeader>
      <CardContent>
        <ProgramsContent 
          isLoading={isPageLoading}
          programs={programs}
          channels={channels}
          selectedChannelId={selectedChannelId}
          currentPage={currentPage}
          totalPages={totalPages}
          filteredPrograms={filteredPrograms}
          onChannelChange={handleChannelChange}
          onEdit={handleEditProgram}
          onDelete={handleDeleteProgram}
          onPageChange={handlePageChange}
          getCurrentPagePrograms={getCurrentPagePrograms}
        />
      </CardContent>
      <CardFooter>
        <ProgramsFooter 
          onRefresh={loadData}
          isLoading={isPageLoading}
          totalCount={filteredPrograms.length}
          currentPage={currentPage}
          itemsPerPage={10}
        />
      </CardFooter>

      {/* Add Program Dialog */}
      <ProgramFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleAddProgram}
        title="Añadir Programa"
        channels={channels}
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
          channels={channels}
        />
      )}
    </Card>
  );
}
