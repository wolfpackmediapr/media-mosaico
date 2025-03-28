
import { supabase } from "@/integrations/supabase/client";
import { RadioMigration, MigrationStatus } from "../types";

/**
 * Get current version from the database
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('radio_data_version')
      .select('version')
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      return data[0].version;
    }
    
    return '0.0';
  } catch (error) {
    console.error('Error getting current version:', error);
    return '0.0';
  }
}

/**
 * Update the data version in the database
 */
export async function updateDataVersion(version: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('radio_data_version')
      .insert({ version });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating data version:', error);
    throw error;
  }
}

/**
 * Log a migration in the database
 */
export async function logMigration(migration: Omit<RadioMigration, 'id'>): Promise<RadioMigration> {
  try {
    const { data, error } = await supabase
      .from('radio_migrations')
      .insert(migration)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as RadioMigration;
  } catch (error) {
    console.error('Error logging migration:', error);
    throw error;
  }
}

/**
 * Get all migrations from the database
 */
export async function getMigrations(): Promise<RadioMigration[]> {
  try {
    const { data, error } = await supabase
      .from('radio_migrations')
      .select('*')
      .order('applied_at', { ascending: false });
    
    if (error) throw error;
    
    return data as RadioMigration[];
  } catch (error) {
    console.error('Error getting migrations:', error);
    return [];
  }
}
