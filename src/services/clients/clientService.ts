
import { supabase } from "@/integrations/supabase/client";

export interface Client {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

export async function fetchClients(
  sortField: keyof Client = 'name',
  sortOrder: 'asc' | 'desc' = 'asc',
  filterCategory: string = ''
): Promise<Client[]> {
  try {
    let query = supabase
      .from('clients')
      .select('*')
      .order(sortField, { ascending: sortOrder === 'asc' });
    
    // Apply filter if any
    if (filterCategory) {
      query = query.eq('category', filterCategory);
    }
    
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
}

export async function addClient(client: {
  name: string;
  category: string;
  subcategory?: string | null;
  keywords?: string[] | null;
}): Promise<Client> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after insertion');
    }
    
    return data[0];
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
}

export async function updateClient(client: Client): Promise<void> {
  try {
    const { error } = await supabase
      .from('clients')
      .update({
        name: client.name,
        category: client.category,
        subcategory: client.subcategory,
        keywords: client.keywords
      })
      .eq('id', client.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
}

export async function deleteClient(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}

// Format date for display
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
}
