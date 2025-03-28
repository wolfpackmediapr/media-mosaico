
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { TvRatesContent } from "@/components/settings/tv/rates/TvRatesContent";
import { TvRatesFooter } from "@/components/settings/tv/rates/TvRatesFooter";
import { TvRatesImport } from "@/components/settings/tv/rates/TvRatesImport";
import { useTvRatesManagement } from "@/hooks/tv/useTvRatesManagement";
import { TvRatesLoadingState } from "@/components/settings/tv/rates/TvRatesLoadingState";
import { toast } from "sonner";

interface TvTarifasSettingsProps {
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
  
  const isLoadingState = externalLoading || dataLoading;

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
        <CardTitle>Tarifas de TV</CardTitle>
        <CardDescription>
          Administra las tarifas de publicidad para canales de televisión
        </CardDescription>
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
