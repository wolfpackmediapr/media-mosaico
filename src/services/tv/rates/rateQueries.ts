
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";

// Function to fetch all rates
export const fetchRates = async (): Promise<TvRateType[]> => {
  try {
    const { data, error } = await supabase
      .from('tv_rates')
      .select(`
        *,
        channel:channel_id(name),
        program:program_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching TV rates:", error);
      throw error;
    }

    // Transform the data to include channel_name and program_name
    return data.map(rate => ({
      ...rate,
      channel_name: rate.channel?.name || 'Unknown Channel',
      program_name: rate.program?.name || 'Unknown Program'
    }));
  } catch (error) {
    console.error("Error in fetchRates:", error);
    return [];
  }
};

// Function to fetch rates filtered by channel and/or program
export const getRatesByFilter = async (
  channelId?: string,
  programId?: string
): Promise<TvRateType[]> => {
  try {
    let query = supabase
      .from('tv_rates')
      .select(`
        *,
        channel:channel_id(name),
        program:program_id(name)
      `);

    if (channelId && channelId !== 'all') {
      query = query.eq('channel_id', channelId);
    }

    if (programId && programId !== 'all') {
      query = query.eq('program_id', programId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching filtered TV rates:", error);
      throw error;
    }

    // Transform the data to include channel_name and program_name
    return data.map(rate => ({
      ...rate,
      channel_name: rate.channel?.name || 'Unknown Channel',
      program_name: rate.program?.name || 'Unknown Program'
    }));
  } catch (error) {
    console.error("Error in getRatesByFilter:", error);
    return [];
  }
};
