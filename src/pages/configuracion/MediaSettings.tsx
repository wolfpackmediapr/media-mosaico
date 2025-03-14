
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

// Import the service
import { 
  MediaOutlet, 
  fetchMediaOutlets,
  addMediaOutlet,
  updateMediaOutlet,
  deleteMediaOutlet,
  exportMediaOutletsToCSV,
  downloadCSV
} from "@/services/media/mediaService";

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

  // Load data on component mount
  useEffect(() => {
    loadMediaOutlets();
  }, [sortField, sortOrder, filterType]);

  const loadMediaOutlets = async () => {
    setLoading(true);
    try {
      const outlets = await fetchMediaOutlets(sortField, sortOrder, filterType);
      setMediaOutlets(outlets);
    } catch (error) {
      console.error('Error loading media outlets:', error);
      toast.error('Error al cargar los medios');
    } finally {
      setLoading(false);
    }
  };

  // Handle column sort
  const handleSort = (field: keyof MediaOutlet) => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Toggle filter visibility
  const toggleFilter = () => {
    setShowFilter(!showFilter);
    if (showFilter) {
      setFilterType('');
    }
  };

  // Handle filter change
  const handleFilterChange = (type: string) => {
    setFilterType(type);
  };

  // Toggle add form visibility
  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  // Add new media outlet
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

  // Start editing a media outlet
  const handleEditClick = (outlet: MediaOutlet) => {
    setEditingId(outlet.id);
    setEditFormData(outlet);
  };

  // Update edit form data
  const handleEditFormChange = (updatedOutlet: MediaOutlet) => {
    setEditFormData(updatedOutlet);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  // Save edited media outlet
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

  // Delete a media outlet
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

  // Export media outlets to CSV
  const handleExportCSV = () => {
    try {
      const csvContent = exportMediaOutletsToCSV(mediaOutlets);
      const filename = `medios_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      toast.success('Datos exportados correctamente');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Error al exportar los datos');
    }
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
            >
              <FileDown className="h-4 w-4 mr-1" />
              Exportar
            </Button>
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
        {/* Add new media form */}
        {showAddForm && (
          <MediaOutletForm 
            onSubmit={handleAddMediaOutlet}
            onCancel={toggleAddForm}
          />
        )}

        {/* Media outlets table with loading and empty states */}
        {loading ? (
          <MediaLoadingState />
        ) : mediaOutlets.length === 0 ? (
          <MediaEmptyState hasFilter={!!filterType} />
        ) : (
          <MediaOutletsTable 
            mediaOutlets={mediaOutlets}
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
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <p className="text-xs text-muted-foreground">
          Los cambios en los medios pueden afectar a todo el sistema
        </p>
        <Button variant="outline" onClick={loadMediaOutlets}>
          Refrescar
        </Button>
      </CardFooter>
    </SettingsLayout>
  );
}
