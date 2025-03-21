
import { useState } from "react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMediaOutlets } from "@/hooks/settings/useMediaOutlets";
import { defaultCsvData } from "@/services/media/defaultMediaData";

// Import our components
import { MediaHeaderActions } from "@/components/settings/media/MediaHeaderActions";
import { MediaContent } from "@/components/settings/media/MediaContent";
import { MediaFooter } from "@/components/settings/media/MediaFooter";
import { MediaSearch } from "@/components/settings/media/MediaSearch";

export function MediaSettingsContainer() {
  const [showFilter, setShowFilter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { 
    loading,
    mediaOutlets,
    sortField,
    sortOrder,
    filterType,
    searchTerm,
    editingId,
    editFormData,
    currentPage,
    totalPages,
    getCurrentPageOutlets,
    handlePageChange,
    handleSort,
    handleFilterChange,
    handleSearchChange,
    handleAddMediaOutlet,
    handleEditClick,
    handleEditFormChange,
    handleCancelEdit,
    saveEditedOutlet,
    handleDeleteMediaOutlet,
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

  const handleAddSubmit = async (formData: { type: string; name: string; folder: string }): Promise<boolean> => {
    const result = await handleAddMediaOutlet(formData);
    if (result) setShowAddForm(false);
    return result;
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
        
        <div className="mt-4">
          <MediaSearch 
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
          />
        </div>
      </CardHeader>

      <MediaContent 
        loading={loading}
        showAddForm={showAddForm}
        onAddFormSubmit={handleAddSubmit}
        onAddFormCancel={toggleAddForm}
        mediaOutlets={mediaOutletsOnCurrentPage}
        hasFilter={!!filterType || !!searchTerm}
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
