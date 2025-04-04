
import { supabaseTyped } from '@/integrations/supabase/enhanced-client';
import { InstitutionType, InstitutionCategoryType, AgencyType } from './types';
import { toast } from "sonner";

// Institution Category functions
export const fetchInstitutionCategories = async (): Promise<InstitutionCategoryType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('institution_categories')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching institution categories:', error);
    return [];
  }
};

export const createInstitutionCategory = async (categoryData: Omit<InstitutionCategoryType, 'id'>): Promise<InstitutionCategoryType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('institution_categories')
      .insert(categoryData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating institution category:', error);
    throw error;
  }
};

export const updateInstitutionCategory = async (categoryData: InstitutionCategoryType): Promise<InstitutionCategoryType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('institution_categories')
      .update({ name: categoryData.name })
      .eq('id', categoryData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating institution category:', error);
    throw error;
  }
};

export const deleteInstitutionCategory = async (id: string): Promise<void> => {
  try {
    // First check if the category is being used by any institutions
    const { data: institutions, error: checkError } = await supabaseTyped
      .from('institutions')
      .select('id')
      .eq('category_id', id)
      .limit(1);
    
    if (checkError) {
      throw checkError;
    }
    
    if (institutions && institutions.length > 0) {
      throw new Error('No se puede eliminar esta categoría porque está siendo utilizada por instituciones.');
    }
    
    // If not in use, proceed with deletion
    const { error } = await supabaseTyped
      .from('institution_categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting institution category:', error);
    throw error;
  }
};

// Institution functions
export const fetchInstitutions = async (): Promise<InstitutionType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('institutions')
      .select(`
        *,
        institution_categories (
          id,
          name
        )
      `)
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching institutions:', error);
    return [];
  }
};

export const createInstitution = async (institutionData: Omit<InstitutionType, 'id'>): Promise<InstitutionType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('institutions')
      .insert(institutionData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating institution:', error);
    throw error;
  }
};

export const updateInstitution = async (institutionData: InstitutionType): Promise<InstitutionType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('institutions')
      .update({
        name: institutionData.name,
        category_id: institutionData.category_id
      })
      .eq('id', institutionData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating institution:', error);
    throw error;
  }
};

export const deleteInstitution = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseTyped
      .from('institutions')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting institution:', error);
    throw error;
  }
};

// Agency functions
export const fetchAgencies = async (): Promise<AgencyType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('agencies')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching agencies:', error);
    return [];
  }
};

export const createAgency = async (agencyData: Omit<AgencyType, 'id'>): Promise<AgencyType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('agencies')
      .insert(agencyData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating agency:', error);
    throw error;
  }
};

export const updateAgency = async (agencyData: AgencyType): Promise<AgencyType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('agencies')
      .update({ name: agencyData.name })
      .eq('id', agencyData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating agency:', error);
    throw error;
  }
};

export const deleteAgency = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseTyped
      .from('agencies')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting agency:', error);
    throw error;
  }
};
