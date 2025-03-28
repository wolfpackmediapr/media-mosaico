
import { supabase } from "@/integrations/supabase/client";
import { ChannelType, ProgramType } from "../types";
import { defaultTvChannelsData, defaultTvProgramsData, CURRENT_TV_DATA_VERSION } from "./defaultTvData";
import { getDataVersion } from "../utils";

/**
 * Check if TV data should be seeded
 */
export async function shouldSeedTvData(
  forceRefresh = false
): Promise<{ shouldSeedChannels: boolean; shouldSeedPrograms: boolean }> {
  try {
    // If forcing a refresh, always return true
    if (forceRefresh) {
      return { shouldSeedChannels: true, shouldSeedPrograms: true };
    }

    // Check channels in database
    const { data: channels, error: channelsError } = await supabase
      .from('media_outlets')
      .select('count')
      .eq('type', 'tv');

    if (channelsError) throw channelsError;

    // Check programs in database
    const { data: programs, error: programsError } = await supabase
      .from('tv_programs')
      .select('count');

    if (programsError) throw programsError;

    // Check data version
    const version = await getDataVersion();
    const needsVersionUpdate = version !== CURRENT_TV_DATA_VERSION;

    // Determine if seeding is needed
    const shouldSeedChannels = channels.length === 0 || needsVersionUpdate;
    const shouldSeedPrograms = programs.length === 0 || needsVersionUpdate;

    return { shouldSeedChannels, shouldSeedPrograms };
  } catch (error) {
    console.error('Error checking if TV data should be seeded:', error);
    // Default to true if there's an error, to ensure data exists
    return { shouldSeedChannels: true, shouldSeedPrograms: true };
  }
}

/**
 * Create channels in the database
 */
export async function createChannels(): Promise<Record<string, string>> {
  try {
    // Create a map of channel names to IDs
    const channelMap: Record<string, string> = {};

    // Insert channels into the database
    for (const channel of defaultTvChannelsData) {
      const { data, error } = await supabase
        .from('media_outlets')
        .insert({
          name: channel.name,
          type: 'tv',
          folder: channel.code
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating channel ${channel.name}:`, error);
        continue;
      }

      // Add the channel ID to the map
      channelMap[channel.name] = data.id;
    }

    return channelMap;
  } catch (error) {
    console.error('Error creating channels:', error);
    throw error;
  }
}

/**
 * Fetch existing channels from the database
 */
export async function fetchExistingChannels(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('media_outlets')
      .select('id, name')
      .eq('type', 'tv');

    if (error) throw error;

    // Create a map of channel names to IDs
    const channelMap: Record<string, string> = {};
    
    if (data) {
      data.forEach((channel) => {
        channelMap[channel.name] = channel.id;
      });
    }

    return channelMap;
  } catch (error) {
    console.error('Error fetching existing channels:', error);
    throw error;
  }
}

/**
 * Create program data
 */
export function createProgramsData(channelMap: Record<string, string>): ProgramType[] {
  try {
    // Map the default programs to include the channel IDs
    return defaultTvProgramsData.map((program) => {
      // Get the channel ID from the map
      const channelId = channelMap[program.channel];

      if (!channelId) {
        console.warn(`No channel ID found for ${program.channel}`);
        return null;
      }

      // Create the program object
      return {
        id: program.id,
        name: program.name,
        channel_id: channelId,
        start_time: program.start_time,
        end_time: program.end_time,
        days: program.days
      };
    }).filter(Boolean) as ProgramType[];
  } catch (error) {
    console.error('Error creating programs data:', error);
    throw error;
  }
}
