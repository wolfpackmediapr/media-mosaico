
import { supabase } from '@/integrations/supabase/client';
import { ParticipantType, ParticipantCategoryType } from './types';

// Participant functions
export const fetchParticipants = async (): Promise<ParticipantType[]> => {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching participants:', error);
    return [];
  }
};

export const createParticipant = async (participantData: Omit<ParticipantType, 'id'>): Promise<ParticipantType> => {
  try {
    const { data, error } = await supabase
      .from('participants')
      .insert(participantData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating participant:', error);
    throw error;
  }
};

export const updateParticipant = async (participantData: ParticipantType): Promise<ParticipantType> => {
  try {
    const { data, error } = await supabase
      .from('participants')
      .update({
        name: participantData.name,
        category: participantData.category,
        position: participantData.position
      })
      .eq('id', participantData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating participant:', error);
    throw error;
  }
};

export const deleteParticipant = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting participant:', error);
    throw error;
  }
};

// Category functions
export const fetchCategories = async (): Promise<ParticipantCategoryType[]> => {
  try {
    const { data, error } = await supabase
      .from('participant_categories')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const createCategory = async (categoryData: Omit<ParticipantCategoryType, 'id'>): Promise<ParticipantCategoryType> => {
  try {
    const { data, error } = await supabase
      .from('participant_categories')
      .insert(categoryData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const updateCategory = async (categoryData: ParticipantCategoryType): Promise<ParticipantCategoryType> => {
  try {
    const { data, error } = await supabase
      .from('participant_categories')
      .update({ name: categoryData.name })
      .eq('id', categoryData.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<void> => {
  try {
    // First check if the category is being used by any participants
    const { data: participants, error: checkError } = await supabase
      .from('participants')
      .select('id')
      .eq('category', id)
      .limit(1);
    
    if (checkError) {
      throw checkError;
    }
    
    if (participants && participants.length > 0) {
      throw new Error('No se puede eliminar esta categoría porque está siendo utilizada por participantes.');
    }
    
    // If not in use, proceed with deletion
    const { error } = await supabase
      .from('participant_categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
