
import { supabaseTyped } from '@/integrations/supabase/enhanced-client';
import { PressGenreType, PressSectionType, PressSourceType, PressRateType } from './types';
import { toast } from "sonner";

// Press Genre functions
export const fetchPressGenres = async (): Promise<PressGenreType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_genres')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching press genres:', error);
    return [];
  }
};

export const createPressGenre = async (genreData: Omit<PressGenreType, 'id'>): Promise<PressGenreType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_genres')
      .insert(genreData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating press genre:', error);
    throw error;
  }
};

export const updatePressGenre = async (genreData: PressGenreType): Promise<PressGenreType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_genres')
      .update({ name: genreData.name })
      .eq('id', genreData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating press genre:', error);
    throw error;
  }
};

export const deletePressGenre = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseTyped
      .from('press_genres')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting press genre:', error);
    throw error;
  }
};

// Press Section functions
export const fetchPressSections = async (): Promise<PressSectionType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_sections')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching press sections:', error);
    return [];
  }
};

export const createPressSection = async (sectionData: Omit<PressSectionType, 'id'>): Promise<PressSectionType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_sections')
      .insert(sectionData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating press section:', error);
    throw error;
  }
};

export const updatePressSection = async (sectionData: PressSectionType): Promise<PressSectionType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_sections')
      .update({ name: sectionData.name })
      .eq('id', sectionData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating press section:', error);
    throw error;
  }
};

export const deletePressSection = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseTyped
      .from('press_sections')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting press section:', error);
    throw error;
  }
};

// Press Source functions
export const fetchPressSources = async (): Promise<PressSourceType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_sources')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching press sources:', error);
    return [];
  }
};

export const createPressSource = async (sourceData: Omit<PressSourceType, 'id'>): Promise<PressSourceType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_sources')
      .insert(sourceData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating press source:', error);
    throw error;
  }
};

export const updatePressSource = async (sourceData: PressSourceType): Promise<PressSourceType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_sources')
      .update({ name: sourceData.name })
      .eq('id', sourceData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating press source:', error);
    throw error;
  }
};

export const deletePressSource = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseTyped
      .from('press_sources')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting press source:', error);
    throw error;
  }
};

// Press Rate functions
export const fetchPressRates = async (): Promise<PressRateType[]> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_rates')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching press rates:', error);
    return [];
  }
};

export const createPressRate = async (rateData: Omit<PressRateType, 'id'>): Promise<PressRateType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_rates')
      .insert(rateData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating press rate:', error);
    throw error;
  }
};

export const updatePressRate = async (rateData: PressRateType): Promise<PressRateType> => {
  try {
    const { data, error } = await supabaseTyped
      .from('press_rates')
      .update({ name: rateData.name })
      .eq('id', rateData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating press rate:', error);
    throw error;
  }
};

export const deletePressRate = async (id: string): Promise<void> => {
  try {
    const { error } = await supabaseTyped
      .from('press_rates')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting press rate:', error);
    throw error;
  }
};
