
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  MediaOutlet, 
  fetchMediaOutlets,
  addMediaOutlet,
  updateMediaOutlet,
  deleteMediaOutlet,
  exportMediaOutletsToCSV,
  downloadCSV
} from "@/services/media/mediaService";

export function useMediaOutlets() {
  const [mediaOutlets, setMediaOutlets] = useState<MediaOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof MediaOutlet>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<MediaOutlet | null>(null);
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

  const handleFilterChange = (type: string) => {
    setFilterType(type);
  };

  const handleAddMediaOutlet = async (formData: { type: string; name: string; folder: string }) => {
    try {
      await addMediaOutlet({
        type: formData.type,
        name: formData.name,
        folder: formData.folder || null
      });
      toast.success('Medio añadido correctamente');
      loadMediaOutlets();
      return true;
    } catch (error) {
      console.error('Error adding media outlet:', error);
      toast.error('Error al añadir el medio');
      return false;
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
    if (!editFormData) return false;

    try {
      await updateMediaOutlet(editFormData);
      toast.success('Medio actualizado correctamente');
      setEditingId(null);
      setEditFormData(null);
      loadMediaOutlets();
      return true;
    } catch (error) {
      console.error('Error updating media outlet:', error);
      toast.error('Error al actualizar el medio');
      return false;
    }
  };

  const handleDeleteMediaOutlet = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este medio?')) return false;

    try {
      await deleteMediaOutlet(id);
      toast.success('Medio eliminado correctamente');
      loadMediaOutlets();
      return true;
    } catch (error) {
      console.error('Error deleting media outlet:', error);
      toast.error('Error al eliminar el medio');
      return false;
    }
  };

  // Fix: Changed return type to void and removed implicit boolean returns
  const handleExportCSV = async (): Promise<void> => {
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
      // Removed the "return true" that was causing the type error
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Error al exportar los datos');
      // Removed the "return false" that was causing the type error
    }
  };

  const handleImportComplete = () => {
    setImportSuccess(true);
    loadMediaOutlets();
  };

  return {
    mediaOutlets,
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
  };
}
