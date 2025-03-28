
import { 
  shouldSeedRadioData, 
  createStations, 
  fetchExistingStations, 
  createProgramsData 
} from "./data/seedUtils";
import { 
  saveStoredRadioPrograms, 
  isUsingDatabase, 
  saveProgramsToDatabase,
  getStorageStatus
} from "./utils";
import { 
  updateDataVersion as updateDatabaseVersion
} from "./migration/migrationService";
import { migrateLocalStorageToDatabase, runMigrations } from "./migration/radioDataMigrations";
import { CURRENT_RADIO_DATA_VERSION } from "./data/defaultRadioData";
import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the data version in the appropriate storage
 */
async function updateDataVersion(usingDatabase: boolean) {
  if (usingDatabase) {
    await updateDatabaseVersion(CURRENT_RADIO_DATA_VERSION);
  } else {
    localStorage.setItem('radio_data_version', CURRENT_RADIO_DATA_VERSION);
  }
}

/**
 * Seed function to initialize the database with the provided radio data
 */
export async function seedRadioData(forceRefresh = false) {
  try {
    // Check if we're using the database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    // Check if seeding is needed
    const { shouldSeedStations, shouldSeedPrograms } = await shouldSeedRadioData(forceRefresh);
    
    if (!shouldSeedStations && !shouldSeedPrograms) {
      console.log('Radio data already seeded and up to date');
      return; // Data already exists and is current, don't seed
    }
    
    // Build a map of station names to IDs for easy lookup
    let stationMap = {};
    
    // Create stations if needed
    if (shouldSeedStations) {
      stationMap = await createStations();
    } else if (shouldSeedPrograms) {
      // Get existing stations if we only need to seed programs
      stationMap = await fetchExistingStations();
    }
    
    // Process programs if needed
    if (shouldSeedPrograms) {
      // Generate program data
      const programsToAdd = createProgramsData(stationMap);
      
      // Save programs to the appropriate storage
      if (usingDatabase) {
        // Format programs for database insert (remove id and created_at)
        const programsForDb = programsToAdd.map(({ id, created_at, ...rest }) => rest);
        await saveProgramsToDatabase(programsForDb);
      } else {
        // Save to localStorage (legacy)
        saveStoredRadioPrograms(programsToAdd);
      }
      
      // Update the data version
      await updateDataVersion(usingDatabase);
    }
    
    console.log('Radio data seeded successfully');
  } catch (error) {
    console.error('Error seeding radio data:', error);
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
 * Helper to completely reset radio data
 */
export async function resetRadioData() {
  try {
    // Check if we're using the database or localStorage
    const usingDatabase = await isUsingDatabase();
    
    if (usingDatabase) {
      // Delete all programs from database
      const { error } = await supabase.from('radio_programs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    } else {
      // Clear programs from localStorage
      localStorage.removeItem('radio_programs');
      localStorage.removeItem('radio_data_version');
    }
    
    // Force refresh the data
    await seedRadioData(true);
    
    return true;
  } catch (error) {
    console.error('Error resetting radio data:', error);
    throw error;
  }
}
