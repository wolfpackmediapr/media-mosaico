
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";
import { useMediaOutlets } from "@/hooks/settings/useMediaOutlets";
import { defaultCsvData } from "@/services/media/defaultMediaData";

// Import our components
import { MediaOutletForm } from "@/components/settings/media/MediaOutletForm";
import { MediaOutletsTable } from "@/components/settings/media/MediaOutletsTable";
import { MediaFilter } from "@/components/settings/media/MediaFilter";
import { MediaLoadingState } from "@/components/settings/media/MediaLoadingState";
import { MediaEmptyState } from "@/components/settings/media/MediaEmptyState";
import { ImportMediaButton } from "@/components/settings/media/ImportMediaButton";
import { MediaPagination } from "@/components/settings/media/MediaPagination";

export function MediaSettingsContainer() {
  const [showFilter, setShowFilter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const { 
    loading,
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

  // Fix the return type to be Promise<void> instead of Promise<boolean>
  const handleAddSubmit = async (formData: { type: string; name: string; folder: string }): Promise<void> => {
    const success = await handleAddMediaOutlet(formData);
    if (success) {
      setShowAddForm(false);
    }
    // Return undefined explicitly to satisfy the Promise<void> return type
    return;
  };

  const mediaOutletsOnCurrentPage = getCurrentPageOutlets();

  return (
    <>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Medios de Comunicación</span>
          <div className="flex gap-2">
            <MediaFilter 
              filterType={filterType}
              onFilterChange={handleFilterChange}
              showFilter={showFilter}
              onToggleFilter={toggleFilter}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={mediaOutletsOnCurrentPage.length === 0 || loading}
              title="Exportar medios a CSV"
            >
              <FileDown className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
            <ImportMediaButton
              csvData={defaultCsvData}
              onImportComplete={handleImportComplete}
              disabled={loading}
            />
            <Button 
              size="sm"
              onClick={toggleAddForm}
            >
              {showAddForm ? 'Cancelar' : 'Añadir Medio'}
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Lista de medios de comunicación disponibles en el sistema
        </CardDescription>
      </CardHeader>

      <CardContent>
        {showAddForm && (
          <MediaOutletForm 
            onSubmit={handleAddSubmit}
            onCancel={toggleAddForm}
          />
        )}

        {loading ? (
          <MediaLoadingState />
        ) : mediaOutletsOnCurrentPage.length === 0 ? (
          <MediaEmptyState hasFilter={!!filterType} />
        ) : (
          <>
            <MediaOutletsTable 
              mediaOutlets={mediaOutletsOnCurrentPage} 
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
              loading={loading}
            />
            <MediaPagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <p className="text-xs text-muted-foreground">
          {mediaOutletsOnCurrentPage.length > 0 && (
            `Mostrando ${(currentPage - 1) * 10 + 1} a ${Math.min(currentPage * 10, mediaOutletsOnCurrentPage.length + ((currentPage - 1) * 10))} de ${mediaOutletsOnCurrentPage.length + ((currentPage - 1) * 10)} medios`
          )}
        </p>
        <Button variant="outline" onClick={loadMediaOutlets}>
          Refrescar
        </Button>
      </CardFooter>
    </>
  );
}
