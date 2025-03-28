
import { supabase } from "@/integrations/supabase/client";
import { ChannelType, ProgramType } from "../types";
import { getStoredPrograms, isUsingDatabase, getDataVersion } from "../utils";
import { defaultTvChannelsData, CURRENT_TV_DATA_VERSION } from "./defaultTvData";

/**
 * Check if TV data needs to be seeded
 */
export async function shouldSeedTvData(forceRefresh = false): Promise<{
  shouldSeedChannels: boolean;
  shouldSeedPrograms: boolean;
}> {
  // Check if data version is current
  const currentVersion = await getDataVersion();
  
  // First check if we already have channels
  const { data: existingChannels } = await supabase
    .from('media_outlets')
    .select('count')
    .eq('type', 'tv')
    .single();
    
  // Check if we're using database or localStorage
  const usingDatabase = await isUsingDatabase();
  
  // Check for programs in the appropriate storage
  let programsCount = 0;
  
  if (usingDatabase) {
    // Check database for programs
    const { count, error } = await supabase
      .from('tv_programs')
      .select('*', { count: 'exact', head: true });
      
    if (!error && count !== null) {
      programsCount = count;
    }
  } else {
    // Check localStorage for programs (legacy)
    const storedPrograms = getStoredPrograms();
    programsCount = storedPrograms.length;
  }
  
  // Determine if seeding is needed
  const shouldSeedChannels = !existingChannels || existingChannels.count === 0;
  const shouldSeedPrograms = forceRefresh || 
                           programsCount === 0 || 
                           currentVersion !== CURRENT_TV_DATA_VERSION;
  
  return { shouldSeedChannels, shouldSeedPrograms };
}

/**
 * Creates channels in the database
 */
export async function createChannels(): Promise<Record<string, string>> {
  const channelMap: Record<string, string> = {};
  
  for (const channelData of defaultTvChannelsData) {
    // Create channel
    const { data: channel } = await supabase
      .from('media_outlets')
      .insert([
        { name: channelData.name, type: 'tv', folder: channelData.code }
      ])
      .select()
      .single();
    
    if (channel) {
      channelMap[channel.name] = channel.id;
    }
  }
  
  return channelMap;
}

/**
 * Fetches existing channels from the database
 */
export async function fetchExistingChannels(): Promise<Record<string, string>> {
  const channelMap: Record<string, string> = {};
  
  const { data } = await supabase
    .from('media_outlets')
    .select('*')
    .eq('type', 'tv');
  
  if (data) {
    data.forEach(channel => {
      channelMap[channel.name] = channel.id;
    });
  }
  
  return channelMap;
}

/**
 * Creates program data based on channel mapping
 */
export function createProgramsData(channelMap: Record<string, string>): ProgramType[] {
  const programsToAdd: ProgramType[] = [];
  
  // Process all channel data
  for (const channelData of defaultTvChannelsData) {
    const channelId = channelMap[channelData.name];
    
    // Skip if we couldn't find the channel
    if (!channelId) continue;
    
    // Add programs for this channel
    if (channelData.programs && channelData.programs.length > 0) {
      channelData.programs.forEach(prog => {
        programsToAdd.push({
          id: crypto.randomUUID(),
          name: prog.name,
          channel_id: channelId,
          start_time: prog.start_time,
          end_time: prog.end_time,
          days: prog.days,
          created_at: new Date().toISOString()
        });
      });
    }
  }
  
  return programsToAdd;
}
