
import { 
  shouldSeedTvData, 
  createChannels, 
  fetchExistingChannels, 
  createProgramsData 
} from "./data/seedUtils";
import { 
  saveStoredPrograms, 
  getStoredPrograms, 
  isUsingDatabase, 
  saveProgramsToDatabase,
  getStorageStatus
} from "./utils";
import { 
  updateDataVersion as updateDatabaseVersion
} from "./migration/migrationService";
import { migrateLocalStorageToDatabase, runMigrations } from "./migration/tvDataMigrations";
import { CURRENT_TV_DATA_VERSION } from "./data/defaultTvData";
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the data version in the appropriate storage
 */
async function updateDataVersion(usingDatabase: boolean) {
  if (usingDatabase) {
    await updateDatabaseVersion(CURRENT_TV_DATA_VERSION);
  } else {
    localStorage.setItem('tv_data_version', CURRENT_TV_DATA_VERSION);
  }
}

/**
 * Seed function to initialize the database with the provided TV data
 */
export async function seedTvData(forceRefresh = false) {
  try {
    // Check if we're using the database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    // Check if seeding is needed
    const { shouldSeedChannels, shouldSeedPrograms } = await shouldSeedTvData(forceRefresh);
    
    if (!shouldSeedChannels && !shouldSeedPrograms) {
      console.log('TV data already seeded and up to date');
      return; // Data already exists and is current, don't seed
    }
    
    // Build a map of channel names to IDs for easy lookup
    let channelMap = {};
    
    // Create channels if needed
    if (shouldSeedChannels) {
      channelMap = await createChannels();
    } else if (shouldSeedPrograms) {
      // Get existing channels if we only need to seed programs
      channelMap = await fetchExistingChannels();
    }
    
    // Process programs if needed
    if (shouldSeedPrograms) {
      // Generate program data
      const programsToAdd = createProgramsData(channelMap);
      
      // Save programs to the appropriate storage
      if (usingDatabase) {
        // Format programs for database insert (remove id field if it's a generated one)
        const programsForDb = programsToAdd.map(({ id, ...rest }) => {
          // If the ID starts with a code (from defaultTvProgramsData), generate a new UUID
          if (typeof id === 'string' && id.includes('-')) {
            return rest;
          }
          return { id, ...rest };
        });
        
        await saveProgramsToDatabase(programsForDb);
      } else {
        // Save to localStorage (legacy)
        saveStoredPrograms(programsToAdd);
      }
      
      // Update the data version
      await updateDataVersion(usingDatabase);
    }
    
    console.log('TV data seeded successfully');
  } catch (error) {
    console.error('Error seeding TV data:', error);
    throw error;
  }
}

/**
 * Migrate data from localStorage to database
 */
export async function migrateToDatabase() {
  try {
    // Check current storage status
    const status = await getStorageStatus();
    
    // If we already have data in the database but not in localStorage,
    // there's nothing to migrate
    if (status.databaseProgramCount > 0 && status.localStorageProgramCount === 0) {
      console.log('No localStorage data to migrate');
      return false;
    }
    
    // Run migrations and return success if any migrations were applied
    const migrations = await runMigrations();
    return migrations.length > 0;
  } catch (error) {
    console.error('Error migrating to database:', error);
    throw error;
  }
}

/**
 * Helper to completely reset TV data
 */
export async function resetTvData() {
  try {
    // Check if we're using the database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    if (usingDatabase) {
      // First delete all rates from database (to avoid foreign key constraints)
      const { error: ratesError } = await supabase
        .from('tv_rates')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (ratesError) console.error('Error deleting rates:', ratesError);
      
      // Then delete all programs from database
      const { error: programsError } = await supabase
        .from('tv_programs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (programsError) throw programsError;
    } else {
      // Clear programs from localStorage
      localStorage.removeItem('tv_programs');
      localStorage.removeItem('tv_data_version');
    }
    
    // Force refresh the data
    await seedTvData(true);
    
    return true;
  } catch (error) {
    console.error('Error resetting TV data:', error);
    throw error;
  }
}
