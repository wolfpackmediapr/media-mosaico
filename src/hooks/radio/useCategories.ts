
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
        console.log('[useCategories] Loading categories...');
        const data = await fetchCategories();
        console.log(`[useCategories] Loaded ${data.length} categories`);
        setCategories(data);
      } catch (error) {
        console.error('[useCategories] Error loading categories:', error);
        toast.error('No se pudieron cargar las categorías');
        setCategories([]);
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
