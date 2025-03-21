
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaOutlet } from "./mediaService";

/**
 * Imports a batch of media outlets from CSV data
 * Checks for duplicates before importing
 */
export async function importMediaOutletsFromCSV(csvData: string): Promise<{
  added: number;
  skipped: number;
}> {
  try {
    // Parse CSV data (simple parser for this specific format)
    const lines = csvData.trim().split('\n');
    const outlets: { name: string; type: string; folder: string | null }[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Split by comma but handle commas inside quotes
      let columns: string[] = [];
      let inQuotes = false;
      let currentColumn = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentColumn.trim());
          currentColumn = '';
        } else {
          currentColumn += char;
        }
      }
      
      columns.push(currentColumn.trim());
      
      // Map columns to outlet properties
      if (columns.length >= 3) {
        const name = columns[0].trim();
        let type = columns[1].trim().toLowerCase();
        const folder = columns[2].trim() || null;
        
        // Skip if name is empty
        if (!name) continue;
        
        // Format type to match our system
        switch (type) {
          case 'tv':
            type = 'tv';
            break;
          case 'radio':
            type = 'radio';
            break;
          case 'prensa':
            type = 'prensa';
            break;
          case 'prensa_escrita':
            type = 'prensa_escrita';
            break;
          case '':
            // If type is empty, check name for clues
            if (name.includes('TV') || name.includes('CANAL')) {
              type = 'tv';
            } else if (name.includes('RADIO') || name.includes('FM') || name.includes('AM')) {
              type = 'radio';
            } else {
              type = 'prensa'; // Default to prensa
            }
            break;
          default:
            type = 'prensa'; // Default to prensa for unknown types
        }
        
        outlets.push({
          name,
          type,
          folder
        });
      }
    }
    
    // Check for duplicates and insert new outlets
    let added = 0;
    let skipped = 0;
    
    // Get existing outlets to check for duplicates
    const { data: existingOutlets } = await supabase
      .from('media_outlets')
      .select('name, type')
      .order('name');
    
    const existingMap = new Map();
    if (existingOutlets) {
      existingOutlets.forEach(outlet => {
        existingMap.set(`${outlet.name.toUpperCase()}_${outlet.type}`, true);
      });
    }
    
    // Process in batches to avoid hitting rate limits
    const batchSize = 50;
    for (let i = 0; i < outlets.length; i += batchSize) {
      const batch = outlets.slice(i, i + batchSize);
      
      // Filter out duplicates
      const newOutlets = batch.filter(outlet => {
        const key = `${outlet.name.toUpperCase()}_${outlet.type}`;
        const exists = existingMap.has(key);
        
        if (exists) {
          skipped++;
          return false;
        } else {
          existingMap.set(key, true); // Add to map to avoid duplicates within this import
          added++;
          return true;
        }
      });
      
      if (newOutlets.length > 0) {
        const { error } = await supabase
          .from('media_outlets')
          .insert(newOutlets);
        
        if (error) {
          console.error('Error inserting batch:', error);
          throw new Error(`Error inserting media outlets: ${error.message}`);
        }
      }
      
      // Small delay to avoid rate limiting
      if (i + batchSize < outlets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return { added, skipped };
  } catch (error) {
    console.error('Error importing media outlets:', error);
    throw error;
  }
}

export async function seedMediaOutlets(csvData: string): Promise<void> {
  try {
    const result = await importMediaOutletsFromCSV(csvData);
    console.log(`Media outlets import complete. Added: ${result.added}, Skipped: ${result.skipped}`);
  } catch (error) {
    console.error('Failed to seed media outlets:', error);
    toast.error('Error al importar medios');
  }
}
