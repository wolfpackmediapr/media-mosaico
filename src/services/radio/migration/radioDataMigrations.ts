
import { supabase } from "@/integrations/supabase/client";
import { ProgramType, RadioMigration, MigrationStatus } from "../types";
import { getStoredRadioPrograms } from "../utils";
import { CURRENT_RADIO_DATA_VERSION } from "../data/defaultRadioData";
import { fetchStations } from "../stationService";
import { logMigration, updateDataVersion } from "./migrationService";

/**
 * Migrate localStorage programs to the database
 */
export async function migrateLocalStorageToDatabase(): Promise<RadioMigration> {
  try {
    // Get user ID for the migration log (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Get existing programs from localStorage
    const storedPrograms = getStoredRadioPrograms();
    
    if (storedPrograms.length === 0) {
      return logMigration({
        version: '1.0',
        name: 'migrate-local-storage-to-db',
        description: 'No programs found in localStorage to migrate',
        applied_at: new Date().toISOString(),
        applied_by: userId || null,
        status: MigrationStatus.COMPLETED,
        rollback_info: null
      });
    }
    
    // Insert all programs to the database
    const { data, error } = await supabase
      .from('radio_programs')
      .insert(storedPrograms.map(program => ({
        name: program.name,
        station_id: program.station_id,
        start_time: program.start_time,
        end_time: program.end_time,
        days: program.days,
        host: program.host
      })))
      .select();
    
    if (error) throw error;
    
    // Log the migration
    const migration = await logMigration({
      version: '1.0',
      name: 'migrate-local-storage-to-db',
      description: `Migrated ${storedPrograms.length} programs from localStorage to database`,
      applied_at: new Date().toISOString(),
      applied_by: userId || null,
      status: MigrationStatus.COMPLETED,
      rollback_info: { programs: storedPrograms }
    });
    
    // Update the data version
    await updateDataVersion('1.0');
    
    return migration;
  } catch (error) {
    console.error('Error migrating localStorage to database:', error);
    
    // Log the failed migration
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    return logMigration({
      version: '1.0',
      name: 'migrate-local-storage-to-db',
      description: `Migration failed: ${error}`,
      applied_at: new Date().toISOString(),
      applied_by: userId || null,
      status: MigrationStatus.FAILED,
      rollback_info: null
    });
  }
}

/**
 * Explicitly export migrateToDatabase as an alias for migrateLocalStorageToDatabase
 * This resolves the import error in RadioMigrationPanel
 */
export const migrateToDatabase = migrateLocalStorageToDatabase;

/**
 * Run the necessary migrations for radio data
 */
export async function runMigrations(): Promise<RadioMigration[]> {
  try {
    const migrations: RadioMigration[] = [];
    
    // Run localStorage to database migration
    const migration = await migrateLocalStorageToDatabase();
    migrations.push(migration);
    
    return migrations;
  } catch (error) {
    console.error('Error running migrations:', error);
    return [];
  }
}

/**
 * Validate localStorage data before migration
 */
export async function validateLocalStorageData(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  try {
    const storedPrograms = getStoredRadioPrograms();
    const issues: string[] = [];
    
    // Check if we have any programs
    if (storedPrograms.length === 0) {
      issues.push("No se encontraron programas en localStorage");
      return { valid: false, issues };
    }
    
    // Validate each program
    storedPrograms.forEach((program: ProgramType, index: number) => {
      if (!program.name) {
        issues.push(`Programa ${index+1}: Falta el nombre`);
      }
      if (!program.station_id) {
        issues.push(`Programa ${index+1} (${program.name || 'sin nombre'}): Falta el ID de la estación`);
      }
      if (!program.start_time) {
        issues.push(`Programa ${index+1} (${program.name || 'sin nombre'}): Falta la hora de inicio`);
      }
      if (!program.end_time) {
        issues.push(`Programa ${index+1} (${program.name || 'sin nombre'}): Falta la hora de fin`);
      }
      if (!program.days || program.days.length === 0) {
        issues.push(`Programa ${index+1} (${program.name || 'sin nombre'}): Faltan los días`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('Error validating localStorage data:', error);
    return {
      valid: false,
      issues: [`Error al validar datos: ${error}`]
    };
  }
}

/**
 * Calculate migration stats
 */
export async function getMigrationStats(): Promise<{
  programsToMigrate: number;
  stationsNeeded: string[];
  estimatedTimeSeconds: number;
}> {
  try {
    const storedPrograms = getStoredRadioPrograms();
    const uniqueStationIds = new Set(storedPrograms.map(p => p.station_id));
    
    // Get station names for the IDs
    const stations = await fetchStations();
    const stationMap = stations.reduce((map, station) => {
      map[station.id] = station.name;
      return map;
    }, {} as Record<string, string>);
    
    const stationsNeeded = Array.from(uniqueStationIds)
      .map(id => stationMap[id] || `Estación ID: ${id}`)
      .filter(Boolean);
    
    // Estimate time (roughly 100ms per program)
    const estimatedTimeSeconds = Math.max(1, Math.ceil(storedPrograms.length * 0.1));
    
    return {
      programsToMigrate: storedPrograms.length,
      stationsNeeded,
      estimatedTimeSeconds
    };
  } catch (error) {
    console.error('Error getting migration stats:', error);
    return {
      programsToMigrate: 0,
      stationsNeeded: [],
      estimatedTimeSeconds: 0
    };
  }
}
