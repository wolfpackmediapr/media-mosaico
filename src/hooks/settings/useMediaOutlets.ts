
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { 
  MediaOutlet, 
  fetchMediaOutlets,
  addMediaOutlet,
  updateMediaOutlet,
  deleteMediaOutlet
} from "@/services/media/mediaService";
import { useDebounce } from "@/hooks/useDebounce";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/utils/query-utils";

export function useMediaOutlets() {
  const [sortField, setSortField] = useState<keyof MediaOutlet>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<MediaOutlet | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const queryClient = useQueryClient();

  // Create a query key that includes all filter parameters
  const queryKey = useMemo(() => [
    'mediaOutlets', 
    sortField, 
    sortOrder, 
    filterType, 
    debouncedSearchTerm
  ], [sortField, sortOrder, filterType, debouncedSearchTerm]);

  // Use React Query for data fetching with caching
  const { data: mediaOutlets = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchMediaOutlets(sortField, sortOrder, filterType, debouncedSearchTerm),
    staleTime: STALE_TIME.STANDARD, // 2 minutes stale time
  });

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(mediaOutlets.length / ITEMS_PER_PAGE));
  }, [mediaOutlets.length]);

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage > Math.ceil(mediaOutlets.length / ITEMS_PER_PAGE)) {
      setCurrentPage(1);
    }
  }, [mediaOutlets.length, currentPage]);

  // Get current page items
  const getCurrentPageOutlets = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return mediaOutlets.slice(startIndex, endIndex);
  }, [mediaOutlets, currentPage]);

  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Sort handler
  const handleSort = useCallback((field: keyof MediaOutlet) => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  }, []);

  // Filter change handler
  const handleFilterChange = useCallback((type: string) => {
    setFilterType(type);
  }, []);

  // Search change handler
  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when search changes
  }, []);

  // Add mutation
  const addMutation = useMutation({
    mutationFn: (formData: { type: string; name: string; folder: string }) => 
      addMediaOutlet({
        type: formData.type,
        name: formData.name,
        folder: formData.folder || null
      }),
    onSuccess: () => {
      toast.success('Medio añadido correctamente');
      queryClient.invalidateQueries({ queryKey: ['mediaOutlets'] });
    },
    onError: (error) => {
      console.error('Error adding media outlet:', error);
      toast.error('Error al añadir el medio');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updateMediaOutlet,
    onSuccess: () => {
      toast.success('Medio actualizado correctamente');
      setEditingId(null);
      setEditFormData(null);
      queryClient.invalidateQueries({ queryKey: ['mediaOutlets'] });
    },
    onError: (error) => {
      console.error('Error updating media outlet:', error);
      toast.error('Error al actualizar el medio');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMediaOutlet,
    onSuccess: () => {
      toast.success('Medio eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['mediaOutlets'] });
    },
    onError: (error) => {
      console.error('Error deleting media outlet:', error);
      toast.error('Error al eliminar el medio');
    }
  });

  const handleAddMediaOutlet = async (formData: { type: string; name: string; folder: string }) => {
    try {
      await addMutation.mutateAsync(formData);
      return true;
    } catch {
      return false;
    }
  };

  const handleEditClick = useCallback((outlet: MediaOutlet) => {
    setEditingId(outlet.id);
    setEditFormData(outlet);
  }, []);

  const handleEditFormChange = useCallback((updatedOutlet: MediaOutlet) => {
    setEditFormData(updatedOutlet);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditFormData(null);
  }, []);

  const saveEditedOutlet = async () => {
    if (!editFormData) return false;
    try {
      await updateMutation.mutateAsync(editFormData);
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteMediaOutlet = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este medio?')) return false;
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const handleImportComplete = async (): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: ['mediaOutlets'] });
  };

  const loadMediaOutlets = async () => {
    return refetch();
  };

  return {
    mediaOutlets,
    loading: isLoading,
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
  };
}
