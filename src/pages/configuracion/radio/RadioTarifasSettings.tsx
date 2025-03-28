
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RadioRatesContent } from "@/components/settings/radio/rates/RadioRatesContent";
import { RadioRatesFooter } from "@/components/settings/radio/rates/RadioRatesFooter";
import { RadioRatesImport } from "@/components/settings/radio/rates/RadioRatesImport";
import { useRadioRatesManagement } from "@/hooks/radio/useRadioRatesManagement";
import { toast } from "sonner";

export function RadioTarifasSettings() {
  const {
    isLoading,
    searchTerm,
    selectedStation,
    selectedProgram,
    isAddingNew,
    editingId,
    paginatedRates,
    currentPage,
    totalPages,
    itemsPerPage,
    totalRates,
    filteredRates,
    stations,
    programs,
    setSearchTerm,
    setSelectedStation,
    setSelectedProgram,
    setIsAddingNew,
    setCurrentPage,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData
  } = useRadioRatesManagement();

  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleShowAll = () => {
    setSearchTerm("");
    setSelectedStation("all");
    setSelectedProgram("all");
    toast.info("Mostrando todas las tarifas");
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleImportComplete = () => {
    loadData();
    toast.success("Importación completada. Los datos han sido actualizados.");
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Tarifas de Radio</CardTitle>
        <CardDescription>
          Administra las tarifas de publicidad para programas de radio
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <RadioRatesContent
          isLoading={isLoading}
          searchTerm={searchTerm}
          selectedStation={selectedStation}
          selectedProgram={selectedProgram}
          onSearchChange={handleSearchChange}
          onStationChange={setSelectedStation}
          onProgramChange={setSelectedProgram}
          onShowAll={handleShowAll}
          isAddingNew={isAddingNew}
          onAddRate={handleAddRate}
          onCancelAdd={handleCancelAdd}
          filteredRates={paginatedRates}
          totalRates={totalRates}
          onEdit={handleEditRate}
          onDelete={handleDeleteRate}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          editingId={editingId}
          stations={stations}
          programs={programs}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onImportClick={() => setShowImportDialog(true)}
        />
      </CardContent>
      
      <CardFooter>
        <RadioRatesFooter
          onRefresh={loadData}
          isLoading={isLoading}
          totalRates={filteredRates.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </CardFooter>
      
      <RadioRatesImport 
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
