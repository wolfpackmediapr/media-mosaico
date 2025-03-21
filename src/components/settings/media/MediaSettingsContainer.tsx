
import { useState } from "react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMediaOutlets } from "@/hooks/settings/useMediaOutlets";
import { defaultCsvData } from "@/services/media/defaultMediaData";

// Import our components
import { MediaHeaderActions } from "@/components/settings/media/MediaHeaderActions";
import { MediaContent } from "@/components/settings/media/MediaContent";
import { MediaFooter } from "@/components/settings/media/MediaFooter";

export function MediaSettingsContainer() {
  const [showFilter, setShowFilter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { 
    loading,
    mediaOutlets,
    sortField,
    sortOrder,
    filterType,
    editingId,
    editFormData,
    currentPage,
    totalPages,
    getCurrentPageOutlets,
    handlePageChange,
    handleSort,
    handleFilterChange,
    handleAddMediaOutlet,
    handleEditClick,
    handleEditFormChange,
    handleCancelEdit,
    saveEditedOutlet,
    handleDeleteMediaOutlet,
    handleExportCSV,
    handleImportComplete,
    loadMediaOutlets,
    setFilterType
  } = useMediaOutlets();

  const toggleFilter = () => {
    setShowFilter(!showFilter);
    if (showFilter) {
      setFilterType('');
    }
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  const handleAddSubmit = async (formData: { type: string; name: string; folder: string }): Promise<void> => {
    await handleAddMediaOutlet(formData);
    setShowAddForm(false);
  };

  const handleExport = async (): Promise<void> => {
    // Use void to explicitly discard any potential return value
    await handleExportCSV();
    // No return statement needed, as Promise<void> is implicitly returned
  };

  const mediaOutletsOnCurrentPage = getCurrentPageOutlets();
  const totalMediaOutlets = mediaOutlets.length;

  return (
    <>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Medios de Comunicación</span>
          <MediaHeaderActions 
            filterType={filterType}
            onFilterChange={handleFilterChange}
            showFilter={showFilter}
            onToggleFilter={toggleFilter}
            onExport={handleExport}
            onImportComplete={handleImportComplete}
            onToggleAddForm={toggleAddForm}
            showAddForm={showAddForm}
            hasMediaOutlets={mediaOutletsOnCurrentPage.length > 0}
            loading={loading}
            csvData={defaultCsvData}
          />
        </CardTitle>
        <CardDescription>
          Lista de medios de comunicación disponibles en el sistema
        </CardDescription>
      </CardHeader>

      <MediaContent 
        loading={loading}
        showAddForm={showAddForm}
        onAddFormSubmit={handleAddSubmit}
        onAddFormCancel={toggleAddForm}
        mediaOutlets={mediaOutletsOnCurrentPage}
        hasFilter={!!filterType}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={handleEditClick}
        onDelete={handleDeleteMediaOutlet}
        editingId={editingId}
        editFormData={editFormData}
        onEditFormChange={handleEditFormChange}
        onSaveEdit={saveEditedOutlet}
        onCancelEdit={handleCancelEdit}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      <MediaFooter 
        currentPage={currentPage}
        itemsPerPage={10}
        totalItems={totalMediaOutlets}
        onRefresh={loadMediaOutlets}
        hasItems={mediaOutletsOnCurrentPage.length > 0}
      />
    </>
  );
}
