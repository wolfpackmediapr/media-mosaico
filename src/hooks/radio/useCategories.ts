
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchCategories } from '@/pages/configuracion/categories/categoriesService';
import { Category } from '@/pages/configuracion/categories/types';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const data = await fetchCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('No se pudieron cargar las categorías');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  return {
    categories,
    isLoading
  };
};
