
import { supabase } from "@/integrations/supabase/client";
import { ProgramType, TVMigration, MigrationStatus } from "../types";
import { getStoredPrograms } from "../utils";
import { defaultTvChannelsData, CURRENT_TV_DATA_VERSION } from "../data/defaultTvData";
import { fetchChannels } from "../channelService";
import { logMigration, updateDataVersion } from "./migrationService";

/**
 * Migrate localStorage programs to the database
 */
export async function migrateLocalStorageToDatabase(): Promise<TVMigration> {
  try {
    // Get user ID for the migration log (if authenticated)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Get existing programs from localStorage
    const storedPrograms = getStoredPrograms();
    
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
      .from('tv_programs')
      .insert(storedPrograms.map(program => ({
        name: program.name,
        channel_id: program.channel_id,
        start_time: program.start_time,
        end_time: program.end_time,
        days: program.days
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
 * Run the necessary migrations for TV data
 */
export async function runMigrations(): Promise<TVMigration[]> {
  try {
    const migrations: TVMigration[] = [];
    
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
    const storedPrograms = getStoredPrograms();
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
      if (!program.channel_id) {
        issues.push(`Programa ${index+1} (${program.name || 'sin nombre'}): Falta el ID del canal`);
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
  channelsNeeded: string[];
  estimatedTimeSeconds: number;
}> {
  try {
    const storedPrograms = getStoredPrograms();
    const uniqueChannelIds = new Set(storedPrograms.map(p => p.channel_id));
    
    // Get channel names for the IDs
    const channels = await fetchChannels();
    const channelMap = channels.reduce((map, channel) => {
      map[channel.id] = channel.name;
      return map;
    }, {} as Record<string, string>);
    
    const channelsNeeded = Array.from(uniqueChannelIds)
      .map(id => channelMap[id] || `Canal ID: ${id}`)
      .filter(Boolean);
    
    // Estimate time (roughly 100ms per program)
    const estimatedTimeSeconds = Math.max(1, Math.ceil(storedPrograms.length * 0.1));
    
    return {
      programsToMigrate: storedPrograms.length,
      channelsNeeded,
      estimatedTimeSeconds
    };
  } catch (error) {
    console.error('Error getting migration stats:', error);
    return {
      programsToMigrate: 0,
      channelsNeeded: [],
      estimatedTimeSeconds: 0
    };
  }
}
