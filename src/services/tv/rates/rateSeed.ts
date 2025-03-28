
import { supabase } from "@/integrations/supabase/client";
import { TvRateType } from "../types";

// Function to seed initial sample rates
export const seedSampleRates = async (): Promise<void> => {
  try {
    // Check if there are any existing rates
    const { count, error: countError } = await supabase
      .from('tv_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Error checking for existing TV rates:", countError);
      throw countError;
    }

    // If there are already rates, we don't need to seed
    if (count && count > 0) {
      console.log("TV rates already exist, no need to seed.");
      return;
    }

    // Get channels and programs to create sample rates
    const { data: channels, error: channelsError } = await supabase
      .from('media_outlets')
      .select('id, name')
      .eq('type', 'tv')
      .limit(2);

    if (channelsError || !channels || channels.length === 0) {
      console.error("Error fetching channels for seeding TV rates:", channelsError);
      return;
    }

    const { data: programs, error: programsError } = await supabase
      .from('tv_programs')
      .select('id, name, channel_id')
      .in('channel_id', channels.map(c => c.id))
      .limit(4);

    if (programsError || !programs || programs.length === 0) {
      console.error("Error fetching programs for seeding TV rates:", programsError);
      return;
    }

    // Create some sample rates
    const sampleRates: Omit<TvRateType, 'id' | 'created_at' | 'channel_name' | 'program_name'>[] = [];

    for (const program of programs) {
      sampleRates.push({
        channel_id: program.channel_id,
        program_id: program.id,
        days: ['monday', 'wednesday', 'friday'],
        start_time: '19:00',
        end_time: '20:00',
        rate_15s: null,
        rate_30s: 1500,
        rate_45s: null,
        rate_60s: 2800
      });
    }

    // Insert the sample rates
    if (sampleRates.length > 0) {
      const { error: insertError } = await supabase
        .from('tv_rates')
        .insert(sampleRates);

      if (insertError) {
        console.error("Error inserting sample TV rates:", insertError);
        throw insertError;
      }

      console.log(`Seeded ${sampleRates.length} TV rates successfully.`);
    }
  } catch (error) {
    console.error("Error seeding TV rates:", error);
  }
};
