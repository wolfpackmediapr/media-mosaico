
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RadioRatesContent } from "@/components/settings/radio/rates/RadioRatesContent";
import { RadioRatesFooter } from "@/components/settings/radio/rates/RadioRatesFooter";
import { RadioRatesImport } from "@/components/settings/radio/rates/RadioRatesImport";
import { useRadioRatesManagement } from "@/hooks/radio/useRadioRatesManagement";
import { RadioRatesLoadingState } from "@/components/settings/radio/rates/RadioRatesLoadingState";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { seedInitialRates } from "@/services/radio/rates";

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
  const [isSeeding, setIsSeeding] = useState(false);

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
    setShowImportDialog(false);
  };

  const handleSeedRates = async () => {
    if (!confirm("¿Está seguro que desea cargar los datos de tarifas predefinidos? Esta acción reemplazará todas las tarifas existentes.")) {
      return;
    }

    setIsSeeding(true);
    try {
      await seedInitialRates();
      toast.success("Tarifas predefinidas cargadas correctamente.");
      await loadData();
    } catch (error) {
      console.error("Error seeding Radio rates:", error);
      toast.error("Error al cargar tarifas predefinidas.");
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading || isSeeding) {
    return (
      <>
        <CardHeader>
          <CardTitle>Tarifas de Radio</CardTitle>
          <CardDescription>
            Administra las tarifas de publicidad para programas de radio
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <RadioRatesLoadingState />
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tarifas de Radio</CardTitle>
            <CardDescription>
              Administra las tarifas de publicidad para programas de radio
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSeedRates}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Cargar Tarifas Predefinidas
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <RadioRatesContent
          isLoading={isLoading || isSeeding}
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
          onEdit={(id) => {
            if (id === "") {
              setIsAddingNew(true);
            } else {
              handleEditRate(id);
            }
          }}
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
          isLoading={isLoading || isSeeding}
          totalRates={filteredRates.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </CardFooter>
      
      <RadioRatesImport 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
