
import { useState } from "react";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { RadioRatesHeader } from "@/components/settings/radio/rates/RadioRatesHeader";
import { RadioRatesContent } from "@/components/settings/radio/rates/RadioRatesContent";
import { RadioRatesFooter } from "@/components/settings/radio/rates/RadioRatesFooter";
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
          paginatedRates={paginatedRates}
          onEdit={handleEditRate}
          onDelete={handleDeleteRate}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          editingId={editingId}
          stations={stations}
          programs={programs}
        />
      </CardContent>
      
      <CardFooter>
        <RadioRatesFooter
          onRefresh={loadData}
          isLoading={isLoading}
          totalRates={paginatedRates.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </CardFooter>
    </>
  );
}
