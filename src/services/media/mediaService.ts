
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

// New function for exporting media outlets to CSV
export function exportMediaOutletsToCSV(mediaOutlets: MediaOutlet[]): string {
  // Define headers
  const headers = ['ID', 'Tipo', 'Nombre', 'Carpeta', 'Fecha de Creación'];
  
  // Start with headers
  let csvContent = headers.join(',') + '\n';
  
  // Add each media outlet as a row
  mediaOutlets.forEach(outlet => {
    const row = [
      outlet.id,
      outlet.type,
      // Escape quotes in name to prevent CSV issues
      `"${outlet.name.replace(/"/g, '""')}"`,
      // Handle null folder values and escape quotes
      outlet.folder ? `"${outlet.folder.replace(/"/g, '""')}"` : '',
      outlet.created_at
    ];
    
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

// Helper function to download CSV
export function downloadCSV(csvContent: string, filename: string): void {
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link and trigger the download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
