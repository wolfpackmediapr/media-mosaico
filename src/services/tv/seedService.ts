
import { shouldSeedTvData, createChannels, fetchExistingChannels, createProgramsData, updateDataVersion } from "./data/seedUtils";
import { saveStoredPrograms, getStoredPrograms } from "./utils";

/**
 * Seed function to initialize the database with the provided TV data
 */
export async function seedTvData(forceRefresh = false) {
  try {
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
      
      // Save all programs to localStorage
      saveStoredPrograms(programsToAdd);
      
      // Update the data version
      updateDataVersion();
    }
    
    console.log('TV data seeded successfully');
  } catch (error) {
    console.error('Error seeding TV data:', error);
    throw error;
  }
}

/**
 * Helper to completely reset TV data
 */
export async function resetTvData() {
  try {
    // Clear programs from localStorage
    localStorage.removeItem('tv_programs');
    localStorage.removeItem('tv_data_version');
    
    // Force refresh the data
    await seedTvData(true);
    
    return true;
  } catch (error) {
    console.error('Error resetting TV data:', error);
    throw error;
  }
}
