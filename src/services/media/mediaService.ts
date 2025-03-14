
import { supabase } from "@/integrations/supabase/client";

export interface MediaOutlet {
  id: string;
  type: string;
  name: string;
  folder: string | null;
  created_at: string;
}

export async function fetchMediaOutlets(
  sortField: keyof MediaOutlet = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
  filterType: string = ''
): Promise<MediaOutlet[]> {
  try {
    let query = supabase
      .from('media_outlets')
      .select('*')
      .order(sortField, { ascending: sortOrder === 'asc' });
    
    // Apply filter if any
    if (filterType) {
      query = query.eq('type', filterType);
    }
    
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching media outlets:', error);
    throw error;
  }
}

export async function addMediaOutlet(outlet: {
  type: string;
  name: string;
  folder: string | null;
}): Promise<MediaOutlet> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .insert([outlet])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after insertion');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error adding media outlet:', error);
    throw error;
  }
}

export async function updateMediaOutlet(outlet: MediaOutlet): Promise<void> {
  try {
    const { error } = await supabase
      .from('media_outlets')
      .update({
        type: outlet.type,
        name: outlet.name,
        folder: outlet.folder
      })
      .eq('id', outlet.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating media outlet:', error);
    throw error;
  }
}

export async function deleteMediaOutlet(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('media_outlets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting media outlet:', error);
    throw error;
  }
}
