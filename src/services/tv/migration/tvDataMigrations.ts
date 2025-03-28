
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
