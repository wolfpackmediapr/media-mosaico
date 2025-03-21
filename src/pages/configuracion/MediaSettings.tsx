import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileDown } from "lucide-react";

// Import our components
import { MediaOutletForm } from "@/components/settings/media/MediaOutletForm";
import { MediaOutletsTable } from "@/components/settings/media/MediaOutletsTable";
import { MediaFilter } from "@/components/settings/media/MediaFilter";
import { MediaLoadingState } from "@/components/settings/media/MediaLoadingState";
import { MediaEmptyState } from "@/components/settings/media/MediaEmptyState";
import { ImportMediaButton } from "@/components/settings/media/ImportMediaButton";
import { MediaPagination } from "@/components/settings/media/MediaPagination";

// Import the services
import { 
  MediaOutlet, 
  fetchMediaOutlets,
  addMediaOutlet,
  updateMediaOutlet,
  deleteMediaOutlet,
  exportMediaOutletsToCSV,
  downloadCSV
} from "@/services/media/mediaService";
import { defaultCsvData } from "@/services/media/defaultMediaData";

export default function MediaSettings() {
  const [mediaOutlets, setMediaOutlets] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof MediaOutlet>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('');
  const [showFilter, setShowFilter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<MediaOutlet | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadMediaOutlets();
  }, [sortField, sortOrder, filterType]);

  const loadMediaOutlets = async () => {
    setLoading(true);
    try {
      const outlets = await fetchMediaOutlets(sortField, sortOrder, filterType);
      setMediaOutlets(outlets);
      
      setTotalPages(Math.max(1, Math.ceil(outlets.length / ITEMS_PER_PAGE)));
      
      if (currentPage > Math.ceil(outlets.length / ITEMS_PER_PAGE)) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error loading media outlets:', error);
      toast.error('Error al cargar los medios');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPageOutlets = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return mediaOutlets.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: keyof MediaOutlet) => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const toggleFilter = () => {
    setShowFilter(!showFilter);
    if (showFilter) {
      setFilterType('');
    }
  };

  const handleFilterChange = (type: string) => {
    setFilterType(type);
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  const handleAddMediaOutlet = async (formData: { type: string; name: string; folder: string }) => {
    try {
      await addMediaOutlet({
        type: formData.type,
        name: formData.name,
        folder: formData.folder || null
      });
      toast.success('Medio añadido correctamente');
      setShowAddForm(false);
      loadMediaOutlets();
    } catch (error) {
      console.error('Error adding media outlet:', error);
      toast.error('Error al añadir el medio');
    }
  };

  const handleEditClick = (outlet: MediaOutlet) => {
    setEditingId(outlet.id);
    setEditFormData(outlet);
  };

  const handleEditFormChange = (updatedOutlet: MediaOutlet) => {
    setEditFormData(updatedOutlet);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  const saveEditedOutlet = async () => {
    if (!editFormData) return;

    try {
      await updateMediaOutlet(editFormData);
      toast.success('Medio actualizado correctamente');
      setEditingId(null);
      setEditFormData(null);
      loadMediaOutlets();
    } catch (error) {
      console.error('Error updating media outlet:', error);
      toast.error('Error al actualizar el medio');
    }
  };

  const handleDeleteMediaOutlet = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este medio?')) return;

    try {
      await deleteMediaOutlet(id);
      toast.success('Medio eliminado correctamente');
      loadMediaOutlets();
    } catch (error) {
      console.error('Error deleting media outlet:', error);
      toast.error('Error al eliminar el medio');
    }
  };

  const handleExportCSV = () => {
    try {
      let filenameParts = ['medios'];
      
      if (filterType) {
        const typeLabels: Record<string, string> = {
          'tv': 'television',
          'radio': 'radio',
          'prensa': 'prensa-digital',
          'prensa_escrita': 'prensa-escrita',
          'redes_sociales': 'redes-sociales'
        };
        filenameParts.push(typeLabels[filterType] || filterType);
      }
      
      const dateStr = new Date().toISOString().split('T')[0];
      filenameParts.push(dateStr);
      
      const filename = `${filenameParts.join('_')}.csv`;
      
      const csvContent = exportMediaOutletsToCSV(mediaOutlets);
      downloadCSV(csvContent, filename);
      
      toast.success('Datos exportados correctamente');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const handleImportComplete = () => {
    setImportSuccess(true);
    loadMediaOutlets();
  };

  return (
    <SettingsLayout
      title="Medios"
      description="Administra los medios de comunicación disponibles en el sistema"
    >
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
              disabled={mediaOutlets.length === 0 || loading}
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
            onSubmit={handleAddMediaOutlet}
            onCancel={toggleAddForm}
          />
        )}

        {loading ? (
          <MediaLoadingState />
        ) : mediaOutlets.length === 0 ? (
          <MediaEmptyState hasFilter={!!filterType} />
        ) : (
          <>
            <MediaOutletsTable 
              mediaOutlets={getCurrentPageOutlets()} 
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
          {mediaOutlets.length > 0 && (
            `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1} a ${Math.min(currentPage * ITEMS_PER_PAGE, mediaOutlets.length)} de ${mediaOutlets.length} medios`
          )}
        </p>
        <Button variant="outline" onClick={loadMediaOutlets}>
          Refrescar
        </Button>
      </CardFooter>
    </SettingsLayout>
  );
}
