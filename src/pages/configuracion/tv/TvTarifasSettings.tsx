
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { TvRatesContent } from "@/components/settings/tv/rates/TvRatesContent";
import { TvRatesFooter } from "@/components/settings/tv/rates/TvRatesFooter";
import { TvRatesImport } from "@/components/settings/tv/rates/TvRatesImport";
import { useTvRatesManagement } from "@/hooks/tv/useTvRatesManagement";
import { TvRatesLoadingState } from "@/components/settings/tv/rates/TvRatesLoadingState";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { seedTvRates } from "@/services/tv/rates";

export interface TvTarifasSettingsProps {
  isLoading?: boolean;
}

export function TvTarifasSettings({ isLoading: externalLoading = false }: TvTarifasSettingsProps) {
  const {
    isLoading: dataLoading,
    searchTerm,
    selectedChannel,
    selectedProgram,
    isAddingNew,
    editingId,
    paginatedRates,
    currentPage,
    totalPages,
    itemsPerPage,
    totalRates,
    filteredRates,
    channels,
    programs,
    setSearchTerm,
    setSelectedChannel,
    setSelectedProgram,
    setIsAddingNew,
    setCurrentPage,
    setEditingId,
    handleAddRate,
    handleEditRate,
    handleSaveEdit,
    handleDeleteRate,
    loadData
  } = useTvRatesManagement();

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const isLoadingState = externalLoading || dataLoading || isSeeding;

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleShowAll = () => {
    setSearchTerm("");
    setSelectedChannel("all");
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

  const handleSeedRates = async () => {
    if (!confirm("¿Está seguro que desea cargar los datos de tarifas predefinidos? Esta acción reemplazará todas las tarifas existentes.")) {
      return;
    }

    setIsSeeding(true);
    try {
      await seedTvRates();
      toast.success("Tarifas predefinidas cargadas correctamente.");
      await loadData();
    } catch (error) {
      console.error("Error seeding TV rates:", error);
      toast.error("Error al cargar tarifas predefinidas.");
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoadingState) {
    return (
      <>
        <CardHeader>
          <CardTitle>Tarifas de TV</CardTitle>
          <CardDescription>
            Administra las tarifas de publicidad para canales de televisión
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <TvRatesLoadingState />
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Tarifas de TV</CardTitle>
            <CardDescription>
              Administra las tarifas de publicidad para canales de televisión
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
        <TvRatesContent
          isLoading={isLoadingState}
          searchTerm={searchTerm}
          selectedChannel={selectedChannel}
          selectedProgram={selectedProgram}
          onSearchChange={handleSearchChange}
          onChannelChange={setSelectedChannel}
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
          channels={channels}
          programs={programs}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onImportClick={() => setShowImportDialog(true)}
        />
      </CardContent>
      
      <CardFooter>
        <TvRatesFooter
          onRefresh={loadData}
          isLoading={isLoadingState}
          totalRates={filteredRates.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </CardFooter>
      
      <TvRatesImport 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
