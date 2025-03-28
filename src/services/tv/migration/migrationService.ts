
import { supabase } from "@/integrations/supabase/client";
import { TVMigration, MigrationStatus } from "../types";

/**
 * Get the current TV data version from the database
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('tv_data_version')
      .select('version')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    return data?.version || '0.0';
  } catch (error) {
    console.error('Error getting current TV data version:', error);
    return '0.0';
  }
}

/**
 * Update the data version in the database
 */
export async function updateDataVersion(version: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tv_data_version')
      .update({ version, updated_at: new Date().toISOString() })
      .eq('id', 1);
    
    if (error) {
      // If no record to update, insert a new one
      const { error: insertError } = await supabase
        .from('tv_data_version')
        .insert([{ version, updated_at: new Date().toISOString() }]);
      
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error updating TV data version:', error);
    throw error;
  }
}

/**
 * Log a migration to the database
 */
export async function logMigration(migration: Omit<TVMigration, 'id'>): Promise<TVMigration> {
  try {
    const { data, error } = await supabase
      .from('tv_migrations')
      .insert([migration])
      .select();
    
    if (error) throw error;
    return data[0] as TVMigration;
  } catch (error) {
    console.error('Error logging migration:', error);
    throw error;
  }
}

/**
 * Get all applied migrations
 */
export async function getAppliedMigrations(): Promise<TVMigration[]> {
  try {
    const { data, error } = await supabase
      .from('tv_migrations')
      .select('*')
      .order('applied_at', { ascending: false });
    
    if (error) throw error;
    return data as TVMigration[];
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

/**
 * Get the latest migration by version
 */
export async function getLatestMigration(): Promise<TVMigration | null> {
  try {
    const { data, error } = await supabase
      .from('tv_migrations')
      .select('*')
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data as TVMigration;
  } catch (error) {
    console.error('Error getting latest migration:', error);
    return null;
  }
}

/**
 * Check if a migration has been applied
 */
export async function hasMigrationBeenApplied(version: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('tv_migrations')
      .select('count')
      .eq('version', version)
      .single();
    
    if (error) throw error;
    return data.count > 0;
  } catch (error) {
    console.error('Error checking if migration has been applied:', error);
    return false;
  }
}

/**
 * Validate if data is eligible for migration
 */
export async function validateMigrationEligibility(): Promise<{ 
  eligible: boolean; 
  programCount: number;
  message: string; 
}> {
  try {
    // Check if we're already using the database
    const alreadyUsingDb = await isUsingDatabaseExclusively();
    if (alreadyUsingDb) {
      return {
        eligible: false,
        programCount: 0,
        message: "Los datos ya están almacenados en la base de datos."
      };
    }
    
    // Check how many programs we have in localStorage
    const localStoragePrograms = JSON.parse(localStorage.getItem('tv_programs') || '[]');
    const programCount = localStoragePrograms.length;
    
    if (programCount === 0) {
      return {
        eligible: false,
        programCount: 0,
        message: "No se encontraron programas para migrar en el almacenamiento local."
      };
    }
    
    // Check if we already have programs in the database
    const { count, error } = await supabase
      .from('tv_programs')
      .select('*', { count: 'exact', head: true });
      
    if (error) throw error;
    
    // If there are already programs in the database, we need to warn the user
    if (count && count > 0) {
      return {
        eligible: true,
        programCount,
        message: `Se encontraron ${programCount} programas en localStorage, pero también hay ${count} programas en la base de datos. La migración podría causar duplicados.`
      };
    }
    
    return {
      eligible: true,
      programCount,
      message: `Se encontraron ${programCount} programas listos para migrar.`
    };
  } catch (error) {
    console.error('Error validating migration eligibility:', error);
    return {
      eligible: false,
      programCount: 0,
      message: "Error al validar los datos para migración."
    };
  }
}

/**
 * Check if we're exclusively using the database (no localStorage fallback)
 */
async function isUsingDatabaseExclusively(): Promise<boolean> {
  try {
    // Check if we have any programs in the database
    const { count: dbCount, error: dbError } = await supabase
      .from('tv_programs')
      .select('*', { count: 'exact', head: true });
    
    if (dbError) throw dbError;
    
    // Check if we have any programs in localStorage
    const localStoragePrograms = JSON.parse(localStorage.getItem('tv_programs') || '[]');
    
    // If we have programs in the database but none in localStorage, we're exclusively using the database
    return (dbCount && dbCount > 0) && localStoragePrograms.length === 0;
  } catch (error) {
    console.error('Error checking if using database exclusively:', error);
    return false;
  }
}
