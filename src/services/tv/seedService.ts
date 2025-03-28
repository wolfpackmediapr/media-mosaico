
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
  saveProgramsToDatabase 
} from "./utils";
import { 
  updateDataVersion as updateDatabaseVersion
} from "./migration/migrationService";
import { migrateLocalStorageToDatabase, runMigrations } from "./migration/tvDataMigrations";
import { CURRENT_TV_DATA_VERSION } from "./data/defaultTvData";

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
        // Format programs for database insert (remove id and created_at)
        const programsForDb = programsToAdd.map(({ id, created_at, ...rest }) => rest);
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
      // Delete all programs from database
      const { error } = await supabase.from('tv_programs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
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
