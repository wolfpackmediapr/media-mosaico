
import { supabase } from "@/integrations/supabase/client";
import { ProgramType } from "./types";
import { getCurrentVersion } from "./migration/migrationService";

// Helper function to get programs from localStorage (legacy)
export function getStoredRadioPrograms(): ProgramType[] {
  return JSON.parse(localStorage.getItem('radio_programs') || '[]');
}

// Helper function to save programs to localStorage (legacy)
export function saveStoredRadioPrograms(programs: ProgramType[]): void {
  localStorage.setItem('radio_programs', JSON.stringify(programs));
}

// Function to get programs from database
export async function getProgramsFromDatabase(): Promise<ProgramType[]> {
  try {
    const { data, error } = await supabase
      .from('radio_programs')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as ProgramType[];
  } catch (error) {
    console.error('Error fetching radio programs from database:', error);
    return [];
  }
}

// Function to save programs to database
export async function saveProgramsToDatabase(programs: Omit<ProgramType, 'id' | 'created_at'>[]): Promise<ProgramType[]> {
  try {
    const { data, error } = await supabase
      .from('radio_programs')
      .insert(programs)
      .select();
    
    if (error) throw error;
    return data as ProgramType[];
  } catch (error) {
    console.error('Error saving radio programs to database:', error);
    throw error;
  }
}

// Check if radio data is using database or localStorage
export async function isUsingDatabase(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('radio_programs')
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
    return localStorage.getItem('radio_data_version') || '0.0';
  } catch (error) {
    console.error('Error getting data version:', error);
    // Fall back to localStorage if database failed
    return localStorage.getItem('radio_data_version') || '0.0';
  }
}

// Get storage status with additional information
export async function getStorageStatus(): Promise<{
  usingDatabase: boolean;
  databaseProgramCount: number;
  localStorageProgramCount: number;
  version: string;
}> {
  try {
    // Check database program count
    const { count: dbCount, error } = await supabase
      .from('radio_programs')
      .select('*', { count: 'exact', head: true });
    
    const databaseProgramCount = (error || dbCount === null) ? 0 : dbCount;
    
    // Check localStorage
    const localPrograms = getStoredRadioPrograms();
    const localStorageProgramCount = localPrograms.length;
    
    // Get version
    const version = await getDataVersion();
    
    // Determine which storage we're using
    const usingDatabase = databaseProgramCount > 0;
    
    return {
      usingDatabase,
      databaseProgramCount,
      localStorageProgramCount,
      version
    };
  } catch (error) {
    console.error('Error getting storage status:', error);
    return {
      usingDatabase: false,
      databaseProgramCount: 0,
      localStorageProgramCount: 0,
      version: '0.0'
    };
  }
}
