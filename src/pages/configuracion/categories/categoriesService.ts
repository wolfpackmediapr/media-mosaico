
import { supabase } from "@/integrations/supabase/client";
import { Category } from "./types";

// Mock data for now - until Supabase table is created
const mockCategories: Category[] = [
  { id: "1", name_es: "ENTRETENIMIENTO", name_en: "SHOW BUSINESS & ENTRATAINMENT" },
  { id: "2", name_es: "EDUCACION & CULTURA", name_en: "" },
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
  { id: "17", name_es: "AGENCIAS DE GOBIERNO", name_en: "" },
  { id: "18", name_es: "AMBIENTE", name_en: "ENVIRONMENT" },
];

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    // NOTE: This is commented out because 'categories' table doesn't exist yet
    // We'll need to create this table in Supabase first
    /*
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name_es');

    if (error) throw error;
    return data || [];
    */
    
    // For now, we'll just return mock data
    return mockCategories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<Category> => {
  // In the future, this will add to Supabase
  const newCategory: Category = {
    id: Date.now().toString(),
    ...category
  };
  
  return newCategory;
};

export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<Category> => {
  // In the future, this will update in Supabase
  return {
    id,
    name_es: categoryData.name_es || "",
    name_en: categoryData.name_en || ""
  };
};

export const deleteCategory = async (id: string): Promise<void> => {
  // In the future, this will delete from Supabase
  return;
};
