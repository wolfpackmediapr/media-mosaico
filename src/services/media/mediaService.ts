
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

// Format date for better readability in CSV
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

// Map type codes to readable names
function getTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    'tv': 'Televisión',
    'radio': 'Radio',
    'prensa': 'Prensa Digital',
    'prensa_escrita': 'Prensa Escrita',
    'redes_sociales': 'Redes Sociales'
  };
  
  return typeMap[type] || type;
}

// Escape CSV field to handle special characters
function escapeCSVField(field: string | null): string {
  if (field === null || field === undefined) return '';
  
  // If the field contains commas, quotes, or newlines, wrap it in quotes
  const needsQuotes = /[",\n\r]/.test(field);
  
  // Replace double quotes with two double quotes (CSV escape format)
  const escaped = String(field).replace(/"/g, '""');
  
  return needsQuotes ? `"${escaped}"` : escaped;
}

// New function for exporting media outlets to CSV with better formatting
export function exportMediaOutletsToCSV(mediaOutlets: MediaOutlet[]): string {
  // Define headers
  const headers = ['ID', 'Tipo', 'Nombre', 'Carpeta', 'Fecha de Creación'];
  
  // Start with headers
  let csvContent = headers.join(',') + '\n';
  
  // Sort the outlets by name for better readability (unless they're already sorted)
  const sortedOutlets = [...mediaOutlets].sort((a, b) => a.name.localeCompare(b.name));
  
  // Add each media outlet as a row
  sortedOutlets.forEach(outlet => {
    const row = [
      escapeCSVField(outlet.id),
      escapeCSVField(getTypeDisplayName(outlet.type)),
      escapeCSVField(outlet.name),
      escapeCSVField(outlet.folder),
      escapeCSVField(formatDate(outlet.created_at))
    ];
    
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

// Helper function to download CSV
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for proper Excel UTF-8 encoding
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Create a blob with the CSV content
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link and trigger the download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
