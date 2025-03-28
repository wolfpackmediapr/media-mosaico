
import { supabase } from "@/integrations/supabase/client";
import { RadioRateType } from "../types";

// Function to fetch all rates
export const fetchRates = async (): Promise<RadioRateType[]> => {
  try {
    const { data, error } = await supabase
      .from('radio_rates')
      .select(`
        *,
        station:station_id(name),
        program:program_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching radio rates:", error);
      throw error;
    }

    // Transform the data to include station_name and program_name
    return data.map(rate => ({
      ...rate,
      station_name: rate.station?.name || 'Unknown Station',
      program_name: rate.program?.name || 'Unknown Program'
    }));
  } catch (error) {
    console.error("Error in fetchRates:", error);
    return [];
  }
};

// Function to fetch rates filtered by station and/or program
export const getRatesByFilter = async (
  stationId?: string,
  programId?: string
): Promise<RadioRateType[]> => {
  try {
    let query = supabase
      .from('radio_rates')
      .select(`
        *,
        station:station_id(name),
        program:program_id(name)
      `);

    if (stationId && stationId !== 'all') {
      query = query.eq('station_id', stationId);
    }

    if (programId && programId !== 'all') {
      query = query.eq('program_id', programId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching filtered radio rates:", error);
      throw error;
    }

    // Transform the data to include station_name and program_name
    return data.map(rate => ({
      ...rate,
      station_name: rate.station?.name || 'Unknown Station',
      program_name: rate.program?.name || 'Unknown Program'
    }));
  } catch (error) {
    console.error("Error in getRatesByFilter:", error);
    return [];
  }
};
