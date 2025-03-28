
import { supabase } from "@/integrations/supabase/client";
import { ProgramType } from "./types";
import { getCurrentVersion } from "./migration/migrationService";

// Check if tv_channels table exists
export async function ensureTablesExist() {
  // Check if tv_channels table exists by checking for TV media outlets
  const { error: channelsCheckError } = await supabase
    .from('media_outlets')
    .select('count')
    .eq('type', 'tv')
    .limit(1);

  // If there's an error or no channels table, create it
  if (channelsCheckError) {
    console.error('Error checking tv channels in media_outlets:', channelsCheckError);
  }
}

// Helper function to get programs from localStorage (legacy)
export function getStoredPrograms(): ProgramType[] {
  return JSON.parse(localStorage.getItem('tv_programs') || '[]');
}

// Helper function to save programs to localStorage (legacy)
export function saveStoredPrograms(programs: ProgramType[]): void {
  localStorage.setItem('tv_programs', JSON.stringify(programs));
}

// New function to get programs from database
export async function getProgramsFromDatabase(): Promise<ProgramType[]> {
  try {
    const { data, error } = await supabase
      .from('tv_programs')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as ProgramType[];
  } catch (error) {
    console.error('Error fetching programs from database:', error);
    return [];
  }
}

// New function to save programs to database
export async function saveProgramsToDatabase(programs: Omit<ProgramType, 'id' | 'created_at'>[]): Promise<ProgramType[]> {
  try {
    const { data, error } = await supabase
      .from('tv_programs')
      .insert(programs)
      .select();
    
    if (error) throw error;
    return data as ProgramType[];
  } catch (error) {
    console.error('Error saving programs to database:', error);
    throw error;
  }
}

// Check if TV data is using database or localStorage
export async function isUsingDatabase(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('tv_programs')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    // If we have records in the database, we're using the database
    return count !== null && count > 0;
  } catch (error) {
    console.error('Error checking if using database:', error);
    return false;
  }
}

// Get current data version (compatible with both localStorage and database)
export async function getDataVersion(): Promise<string> {
  try {
    // First try to get from database
    const dbVersion = await getCurrentVersion();
    if (dbVersion !== '0.0') {
      return dbVersion;
    }
    
    // Fall back to localStorage if database failed
    return localStorage.getItem('tv_data_version') || '0.0';
  } catch (error) {
    console.error('Error getting data version:', error);
    // Fall back to localStorage if database failed
    return localStorage.getItem('tv_data_version') || '0.0';
  }
}
