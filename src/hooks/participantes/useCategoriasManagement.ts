
import { useState, useEffect, useCallback } from 'react';
import { ParticipantCategoryType } from '@/services/participantes/types';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} from '@/services/participantes/participantesService';
import { toast } from 'sonner';

export const useCategoriasManagement = () => {
  const [categories, setCategories] = useState<ParticipantCategoryType[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ParticipantCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<ParticipantCategoryType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
      setFilteredCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = categories.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, categories]);

  const handleAddCategory = async (name: string) => {
    if (!name.trim()) {
      toast.error('El nombre de la categoría no puede estar vacío');
      return false;
    }

    try {
      const newCategory = await createCategory({ name: name.toUpperCase() });
      setCategories(prev => [...prev, newCategory]);
      toast.success('Categoría agregada correctamente');
      setIsAdding(false);
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('No se pudo agregar la categoría');
      return false;
    }
  };

  const handleUpdateCategory = async (categoryData: ParticipantCategoryType) => {
    if (!categoryData.name.trim()) {
      toast.error('El nombre de la categoría no puede estar vacío');
      return false;
    }

    try {
      const updatedCategory = await updateCategory({
        ...categoryData,
        name: categoryData.name.toUpperCase()
      });
      setCategories(prev => 
        prev.map(c => c.id === updatedCategory.id ? updatedCategory : c)
      );
      toast.success('Categoría actualizada correctamente');
      setIsEditing(false);
      setCurrentCategory(null);
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('No se pudo actualizar la categoría');
      return false;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoría eliminada correctamente');
      return true;
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'No se pudo eliminar la categoría');
      return false;
    }
  };

  const startEdit = (category: ParticipantCategoryType) => {
    setCurrentCategory(category);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setCurrentCategory(null);
  };

  const startAdd = () => {
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  return {
    categories,
    filteredCategories,
    currentItems,
    loading,
    searchTerm,
    isAdding,
    isEditing,
    currentCategory,
    currentPage,
    totalPages,
    setSearchTerm,
    setCurrentPage,
    startAdd,
    cancelAdd,
    startEdit,
    cancelEdit,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    loadCategories
  };
};
