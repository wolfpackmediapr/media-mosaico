
import { supabase } from "@/integrations/supabase/client";
import { Category } from "./types";

// Fallback categories if database is empty or table doesn't exist
const fallbackCategories: Category[] = [
  { id: "1", name_es: "ENTRETENIMIENTO", name_en: "SHOW BUSINESS & ENTERTAINMENT" },
  { id: "2", name_es: "EDUCACION & CULTURA", name_en: "EDUCATION & CULTURE" },
  { id: "3", name_es: "COMUNIDAD", name_en: "COMMUNITY" },
  { id: "4", name_es: "SALUD", name_en: "HEALTH & FITNESS" },
  { id: "5", name_es: "CRIMEN", name_en: "CRIME" },
  { id: "6", name_es: "TRIBUNALES", name_en: "COURT & JUSTICE" },
  { id: "7", name_es: "AMBIENTE & EL TIEMPO", name_en: "WEATHER & ENVIRONMENT" },
  { id: "8", name_es: "ECONOMIA & NEGOCIOS", name_en: "BUSINESS & ECONOMY" },
  { id: "9", name_es: "GOBIERNO", name_en: "GOVERNMENT & GOV. AGENCIES" },
  { id: "10", name_es: "POLITICA", name_en: "POLITICS" },
  { id: "11", name_es: "EE.UU. & INTERNACIONALES", name_en: "USA & INTERNATIONAL NEWS" },
  { id: "12", name_es: "DEPORTES", name_en: "SPORTS" },
  { id: "13", name_es: "RELIGION", name_en: "RELIGIOUS" },
  { id: "14", name_es: "OTRAS", name_en: "OTHER" },
  { id: "15", name_es: "ACCIDENTES", name_en: "ACCIDENTS" },
  { id: "16", name_es: "CIENCIA & TECNOLOGIA", name_en: "SCIENCE & TECHNOLOGY" },
  { id: "17", name_es: "AGENCIAS DE GOBIERNO", name_en: "GOVERNMENT AGENCIES" },
  { id: "18", name_es: "AMBIENTE", name_en: "ENVIRONMENT" },
];

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    console.log('[categoriesService] Attempting to fetch categories from database...');
    
    // Direct query to categories table
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_es');

    if (error) {
      console.warn('[categoriesService] Database error, using fallback categories:', error.message);
      return fallbackCategories;
    }

    if (data && data.length > 0) {
      console.log(`[categoriesService] Found ${data.length} categories in database`);
      // Map the database results to our Category type
      return data.map((item) => ({
        id: item.id,
        name_es: item.name_es,
        name_en: item.name_en,
        created_at: item.created_at
      }));
    }

    console.log('[categoriesService] No categories found in database, using fallback');
    return fallbackCategories;
  } catch (error) {
    console.error('[categoriesService] Error fetching categories, using fallback:', error);
    return fallbackCategories;
  }
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      name_es: data.name_es,
      name_en: data.name_en,
      created_at: data.created_at
    };
  } catch (error) {
    console.error('Error adding category:', error);
    // Fallback for when table doesn't exist
    const newCategory: Category = {
      id: Date.now().toString(),
      ...category
    };
    return newCategory;
  }
};

export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      name_es: data.name_es,
      name_en: data.name_en,
      created_at: data.created_at
    };
  } catch (error) {
    console.error('Error updating category:', error);
    return {
      id,
      name_es: categoryData.name_es || "",
      name_en: categoryData.name_en || ""
    };
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting category:', error);
    // Silent fail for fallback mode
  }
};
