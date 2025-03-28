
import { supabase } from "@/integrations/supabase/client";
import { RadioRateType } from "./types";
import { toast } from "sonner";

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

// Function to create a new rate
export const createRate = async (
  rateData: Omit<RadioRateType, 'id' | 'created_at' | 'station_name' | 'program_name'>
): Promise<RadioRateType> => {
  try {
    const { data, error } = await supabase
      .from('radio_rates')
      .insert(rateData)
      .select()
      .single();

    if (error) {
      console.error("Error creating radio rate:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createRate:", error);
    throw error;
  }
};

// Function to update an existing rate
export const updateRate = async (
  rateData: Omit<RadioRateType, 'created_at' | 'station_name' | 'program_name'>
): Promise<void> => {
  try {
    // Create a new object without the station_name and program_name properties
    const { id, station_id, program_id, days, start_time, end_time, rate_15s, rate_30s, rate_45s, rate_60s } = rateData;
    
    const { error } = await supabase
      .from('radio_rates')
      .update({ 
        station_id, 
        program_id, 
        days, 
        start_time, 
        end_time, 
        rate_15s, 
        rate_30s, 
        rate_45s, 
        rate_60s 
      })
      .eq('id', id);

    if (error) {
      console.error("Error updating radio rate:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in updateRate:", error);
    throw error;
  }
};

// Function to delete a rate
export const deleteRate = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('radio_rates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting radio rate:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteRate:", error);
    throw error;
  }
};

// Utility function to seed initial radio rates data
export const seedInitialRates = async (): Promise<void> => {
  try {
    // Check if there are already rates in the table
    const { count, error: countError } = await supabase
      .from('radio_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Error checking radio rates count:", countError);
      return;
    }

    // Only seed if there are no rates yet
    if (count === 0) {
      console.log("Seeding initial radio rates...");
      
      // Get some stations and programs to use in the seed data
      const { data: stations, error: stationsError } = await supabase
        .from('media_outlets')
        .select('id, name')
        .eq('type', 'radio')
        .limit(5);
        
      if (stationsError) {
        console.error("Error fetching stations for seeding:", stationsError);
        return;
      }
      
      if (!stations || stations.length === 0) {
        console.warn("No stations found for seeding rates");
        return;
      }
      
      const { data: programs, error: programsError } = await supabase
        .from('radio_programs')
        .select('id, name, station_id')
        .limit(10);
        
      if (programsError) {
        console.error("Error fetching programs for seeding:", programsError);
        return;
      }
      
      if (!programs || programs.length === 0) {
        console.warn("No programs found for seeding rates");
        return;
      }
      
      // Create sample rates data
      const sampleRates = programs.map(program => {
        const station = stations.find(s => s.id === program.station_id);
        
        return {
          station_id: program.station_id,
          program_id: program.id,
          days: ['L', 'M', 'X', 'J', 'V'],
          start_time: '07:00:00',
          end_time: '09:00:00',
          rate_15s: Math.floor(Math.random() * 100) + 50,
          rate_30s: Math.floor(Math.random() * 200) + 100,
          rate_45s: Math.floor(Math.random() * 300) + 150,
          rate_60s: Math.floor(Math.random() * 400) + 200
        };
      });
      
      // Insert the sample rates
      const { error: insertError } = await supabase
        .from('radio_rates')
        .insert(sampleRates);
        
      if (insertError) {
        console.error("Error seeding initial radio rates:", insertError);
        return;
      }
      
      console.log("Successfully seeded initial radio rates");
    } else {
      console.log("Radio rates table already contains data, skipping seed");
    }
  } catch (error) {
    console.error("Error in seedInitialRates:", error);
  }
};
